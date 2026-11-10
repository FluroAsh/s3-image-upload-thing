import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { holdingSet, setsToMove } from "~/shared/collections";
import type {
	Collection,
	CollectionPhoto,
	CollectionsFile,
	CreateCollectionResponse,
	DeleteCollectionResponse,
	ReorderCollectionResponse,
	SetMembersResponse,
	UpdateCollectionResponse,
	UpdatePhotoResponse,
} from "~/shared/types";

import {
	CollectionsConflictError,
	CollectionsValidationError,
	readCollections,
	updateCollections,
} from "../services/collections";
import { MANIFEST_FILE_NAME } from "../services/manifest";
import { type BucketLocation, objectExists } from "../services/s3-operations";
import { badRequest, bucketOf, respond } from "./respond";

type Moved = SetMembersResponse["moved"];

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

const isText = (value: unknown): value is string | null | undefined =>
	value === undefined || value === null || typeof value === "string";

const readBody = async (ctx: Context): Promise<Record<string, unknown>> => {
	const body = await ctx.req.json().catch(() => null);
	if (typeof body !== "object" || body === null) throw badRequest("Body must be a JSON object");
	return body;
};

const slugOf = (name: string): string =>
	name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const requireName = (name: unknown): string => {
	if (typeof name !== "string" || !slugOf(name)) throw badRequest("Name must be text with a letter or digit");
	return name;
};

const assertCollection = (file: CollectionsFile, slug: string): void => {
	if (!file.collections.some((candidate) => candidate.slug === slug)) {
		throw new HTTPException(404, { message: `No collection "${slug}"` });
	}
};

// The file was just written and validated, so the collection is there.
const written = (file: CollectionsFile, slug: string): Collection =>
	file.collections.find((candidate) => candidate.slug === slug) as Collection;

const uniqueSlug = (base: string, collections: Collection[]): string => {
	const taken = new Set(collections.map(({ slug }) => slug));
	let slug = base;
	for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
	return slug;
};

const blankPhoto = (set: string): CollectionPhoto => ({ set, alt: null, caption: null, tags: [] });

/** Collections-specific failures carry their own status; everything else goes through the shared handler. */
const respondCollections = <Body>(ctx: Context, run: () => Promise<Body>, status: 200 | 201 = 200) =>
	respond(
		ctx,
		() =>
			run().catch((error: unknown) => {
				if (error instanceof CollectionsValidationError) throw badRequest(error.message);
				if (error instanceof CollectionsConflictError) throw new HTTPException(409, { message: error.message });
				throw error;
			}),
		status,
	);

const assertSetsHaveManifests = async (sets: string[], location: BucketLocation): Promise<void> => {
	const found = await Promise.all(sets.map((set) => objectExists(`${set}/${MANIFEST_FILE_NAME}`, location)));
	const missing = sets.filter((_, index) => !found[index]);
	if (missing.length > 0) throw badRequest(`No manifest for: ${missing.join(", ")}`);
};

/** Takes `sets` out of every collection except `keep`, returning the photos taken; a collection left with no photos is dropped, as the file may not hold one. */
const takeOut = (collections: Collection[], sets: string[], keep: string | null) => {
	const taken = new Map<string, CollectionPhoto>();
	const remaining = collections.flatMap((collection): Collection[] => {
		if (collection.slug === keep) return [collection];

		const photos = collection.photos.filter((photo) => {
			if (!sets.includes(photo.set)) return true;
			taken.set(photo.set, photo);
			return false;
		});
		if (photos.length === 0) return [];

		const { cover, ...rest } = collection;
		return [{ ...rest, photos, ...(photos.some(({ set }) => set === cover) && { cover }) }];
	});
	return { taken, remaining };
};

const movedFrom = (before: CollectionsFile, sets: string[], into: string | null): Moved =>
	setsToMove(before, sets, into).map(({ set, from }) => ({ set, from: from.slug }));

export const listCollectionsHandler = (ctx: Context) =>
	respondCollections<CollectionsFile>(ctx, async () => (await readCollections(bucketOf(ctx))).file);

export const createCollectionHandler = (ctx: Context) =>
	respondCollections<CreateCollectionResponse>(
		ctx,
		async () => {
			const body = await readBody(ctx);
			const name = requireName(body.name);
			const { sets } = body;
			if (!isStringArray(sets) || sets.length === 0) throw badRequest("Sets must be a non-empty list of set paths");
			await assertSetsHaveManifests(sets, bucketOf(ctx));

			const base = slugOf(name);
			const { before, after } = await updateCollections((file) => {
				const { taken, remaining } = takeOut(file.collections, sets, null);
				const created = {
					slug: uniqueSlug(base, file.collections),
					name: name.trim(),
					photos: sets.map((set) => taken.get(set) ?? blankPhoto(set)),
				};
				return { ...file, collections: [...remaining, created] };
			}, bucketOf(ctx));

			const collection = written(after, uniqueSlug(base, before.collections));
			return { collection, moved: movedFrom(before, sets, null) };
		},
		201,
	);

export const setMembersHandler = (ctx: Context) =>
	respondCollections<SetMembersResponse>(ctx, async () => {
		const { sets, collection } = await readBody(ctx);
		if (!isStringArray(sets) || sets.length === 0) throw badRequest("Sets must be a non-empty list of set paths");
		if (collection !== null && typeof collection !== "string") throw badRequest("Collection must be a slug or null");

		if (collection !== null) await assertSetsHaveManifests(sets, bucketOf(ctx));

		const { before, after } = await updateCollections((file) => {
			if (collection !== null) assertCollection(file, collection);

			const { taken, remaining } = takeOut(file.collections, sets, collection);
			return {
				...file,
				collections: remaining.map((candidate) => {
					if (candidate.slug !== collection) return candidate;
					const present = new Set(candidate.photos.map(({ set }) => set));
					const added = sets.filter((set) => !present.has(set)).map((set) => taken.get(set) ?? blankPhoto(set));
					return { ...candidate, photos: [...candidate.photos, ...added] };
				}),
			};
		}, bucketOf(ctx));

		return { file: after, moved: movedFrom(before, sets, collection) };
	});

export const updatePhotoHandler = (ctx: Context) =>
	respondCollections<UpdatePhotoResponse>(ctx, async () => {
		const set = ctx.req.param("set");
		const { alt, caption, tags } = await readBody(ctx);
		if (!isText(alt) || !isText(caption)) throw badRequest("Alt and caption must be text or null");
		if (tags !== undefined && !isStringArray(tags)) throw badRequest("Tags must be a list of text");

		const patch = {
			...(alt !== undefined && { alt }),
			...(caption !== undefined && { caption }),
			...(tags !== undefined && { tags }),
		};
		const { after } = await updateCollections((file) => {
			if (!holdingSet(file, set)) {
				throw new HTTPException(404, { message: `Set "${set}" is not in a collection` });
			}
			return {
				...file,
				collections: file.collections.map((collection) => ({
					...collection,
					photos: collection.photos.map((photo) => (photo.set === set ? { ...photo, ...patch } : photo)),
				})),
			};
		}, bucketOf(ctx));

		const photo = holdingSet(after, set)?.photo;
		if (!photo) throw new Error(`Photo "${set}" was not written`);
		return { photo };
	});

/** Applies `change` to the collection at `:slug`, answering 404 when it is gone and the stored collection after the write. */
const changeCollection = async (ctx: Context, change: (collection: Collection) => Collection) => {
	const slug = ctx.req.param("slug");
	const { after } = await updateCollections((file) => {
		assertCollection(file, slug);
		return {
			...file,
			collections: file.collections.map((candidate) => (candidate.slug === slug ? change(candidate) : candidate)),
		};
	}, bucketOf(ctx));

	return { collection: written(after, slug) };
};

export const updateCollectionHandler = (ctx: Context) =>
	respondCollections<UpdateCollectionResponse>(ctx, async () => {
		const { name, cover } = await readBody(ctx);
		const newName = name === undefined ? undefined : requireName(name).trim();
		if (!isText(cover)) throw badRequest("Cover must be a set path or null");

		return changeCollection(ctx, ({ cover: current, ...rest }) => {
			// The validator rejects a cover outside the collection, which answers 400.
			const next = cover === undefined ? current : cover;
			return { ...rest, ...(newName !== undefined && { name: newName }), ...(next != null && { cover: next }) };
		});
	});

export const deleteCollectionHandler = (ctx: Context) =>
	respondCollections<DeleteCollectionResponse>(ctx, async () => {
		const slug = ctx.req.param("slug");
		const { after } = await updateCollections((file) => {
			assertCollection(file, slug);
			return { ...file, collections: file.collections.filter((candidate) => candidate.slug !== slug) };
		}, bucketOf(ctx));
		return { file: after };
	});

export const reorderCollectionHandler = (ctx: Context) =>
	respondCollections<ReorderCollectionResponse>(ctx, async () => {
		const { sets } = await readBody(ctx);
		if (!isStringArray(sets)) throw badRequest("Sets must be a list of set paths");

		return changeCollection(ctx, (collection) => {
			const bySet = new Map(collection.photos.map((photo) => [photo.set, photo]));
			if (sets.length !== bySet.size || new Set(sets).size !== sets.length || !sets.every((set) => bySet.has(set))) {
				throw badRequest("Sets must be exactly the collection's current sets");
			}
			return { ...collection, photos: sets.map((set) => bySet.get(set) as CollectionPhoto) };
		});
	});
