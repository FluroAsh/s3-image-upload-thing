import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type {
	Collection,
	CollectionPhoto,
	CollectionsFile,
	CollectionsResponse,
	CreateCollectionResponse,
	SetMembersResponse,
	UpdatePhotoResponse,
} from "~/shared/types";

import {
	CollectionsConflictError,
	CollectionsValidationError,
	collectionsLocation,
	locateSet,
	readCollections,
	updateCollections,
} from "../services/collections";
import { MANIFEST_FILE_NAME } from "../services/manifest";
import { objectExists } from "../services/s3-operations";

const badRequest = (message: string) => new HTTPException(400, { message });

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

const readBody = async (ctx: Context): Promise<Record<string, unknown>> => {
	const body = await ctx.req.json().catch(() => null);
	if (typeof body !== "object" || body === null || Array.isArray(body)) throw badRequest("Body must be a JSON object");
	return body;
};

const slugOf = (name: string): string =>
	name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const respond = async <Body>(ctx: Context, run: () => Promise<Body>, status: 200 | 201 = 200) => {
	try {
		return ctx.json(await run(), status);
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);
		if (error instanceof CollectionsValidationError) return ctx.json({ error: error.message }, 400);
		if (error instanceof CollectionsConflictError) return ctx.json({ error: error.message }, 409);

		console.error(error);
		return ctx.json({ error: error instanceof Error ? error.message : "Collections request failed" }, 500);
	}
};

const assertSetsHaveManifests = async (sets: string[]): Promise<void> => {
	const found = await Promise.all(
		sets.map((set) => {
			const { location, key } = locateSet(set);
			return objectExists(`${key}/${MANIFEST_FILE_NAME}`, location);
		}),
	);
	const missing = sets.filter((_, index) => !found[index]);
	if (missing.length > 0) throw badRequest(`No manifest for: ${missing.join(", ")}`);
};

export const listCollectionsHandler = (ctx: Context) =>
	respond<CollectionsResponse>(ctx, async () => (await readCollections(collectionsLocation())).file);

export const createCollectionHandler = (ctx: Context) =>
	respond<CreateCollectionResponse>(
		ctx,
		async () => {
			const { name } = await readBody(ctx);
			if (typeof name !== "string" || !slugOf(name)) throw badRequest("Name must be text with a letter or digit");

			const base = slugOf(name);
			let slug = base;
			const collections = await updateCollections((file) => {
				const taken = new Set(file.collections.map((collection) => collection.slug));
				slug = base;
				for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
				return { ...file, collections: [...file.collections, { slug, name: name.trim(), photos: [] }] };
			}, collectionsLocation());

			return { collection: collections.collections.find((collection) => collection.slug === slug) as Collection };
		},
		201,
	);

export const setMembersHandler = (ctx: Context) =>
	respond<SetMembersResponse>(ctx, async () => {
		const { sets, collection } = await readBody(ctx);
		if (!isStringArray(sets) || sets.length === 0) throw badRequest("Sets must be a non-empty list of set paths");
		if (new Set(sets).size < sets.length) throw badRequest("A set can only be listed once");
		if (collection !== null && typeof collection !== "string") throw badRequest("Collection must be a slug or null");

		if (collection !== null) await assertSetsHaveManifests(sets);

		let moved: SetMembersResponse["moved"] = [];
		const change = (file: CollectionsFile): CollectionsFile => {
			const target = file.collections.find(({ slug }) => slug === collection);
			if (collection !== null && !target) throw new HTTPException(404, { message: `No collection "${collection}"` });

			moved = [];
			const kept = new Map<string, CollectionPhoto>();
			for (const from of file.collections) {
				if (from === target) continue;
				from.photos = from.photos.filter((photo) => {
					if (!sets.includes(photo.set)) return true;
					kept.set(photo.set, photo);
					moved.push({ set: photo.set, from: from.slug });
					if (from.cover === photo.set) delete from.cover;
					return false;
				});
			}

			const present = new Set(target?.photos.map(({ set }) => set));
			target?.photos.push(
				...sets
					.filter((set) => !present.has(set))
					.map((set) => kept.get(set) ?? { set, alt: null, caption: null, tags: [] }),
			);
			return file;
		};

		return { file: await updateCollections(change, collectionsLocation()), moved };
	});

export const updatePhotoHandler = (ctx: Context) =>
	respond<UpdatePhotoResponse>(ctx, async () => {
		const set = ctx.req.param("set");
		const { alt, caption, tags } = await readBody(ctx);
		const isText = (value: unknown) => value === undefined || value === null || typeof value === "string";
		if (!isText(alt) || !isText(caption)) throw badRequest("Alt and caption must be text or null");
		if (tags !== undefined && !isStringArray(tags)) throw badRequest("Tags must be a list of text");

		let photo: CollectionPhoto | undefined;
		await updateCollections((file) => {
			photo = file.collections.flatMap((collection) => collection.photos).find((p) => p.set === set);
			if (!photo) throw new HTTPException(404, { message: `Set "${set}" is not in a collection` });
			if (alt !== undefined) photo.alt = alt;
			if (caption !== undefined) photo.caption = caption;
			if (tags !== undefined) photo.tags = tags;
			return file;
		}, collectionsLocation());

		return { photo: photo as unknown as CollectionPhoto };
	});
