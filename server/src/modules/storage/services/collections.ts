import { COLLECTIONS_SCHEMA, type Collection, type CollectionsFile } from "~/shared/types";

import { CDN_PREFIXES } from "./manifest";
import { type BucketLocation, copyObject, defaultRegion, getObjectOrNull, putJson } from "./s3-operations";

export const COLLECTIONS_KEY = "gallery/collections.json";
const HISTORY_PREFIX = "gallery/history/collections-";
const MAX_ATTEMPTS = 3;
const MAX_BYTES = 1_000_000;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CollectionsValidationError extends Error {}
export class CollectionsConflictError extends Error {}

const emptyFile = (): CollectionsFile => ({
	schema: COLLECTIONS_SCHEMA,
	updatedAt: new Date(0).toISOString(),
	collections: [],
});

export const readCollections = async (
	location: BucketLocation,
): Promise<{ file: CollectionsFile; etag: string | null }> => {
	const stored = await getObjectOrNull(COLLECTIONS_KEY, location);
	if (!stored) return { file: emptyFile(), etag: null };

	const file = JSON.parse(stored.body.toString("utf8")) as CollectionsFile;
	if (file.schema !== COLLECTIONS_SCHEMA)
		throw new Error(`"${COLLECTIONS_KEY}" has unknown schema ${String(file.schema)}`);
	return { file, etag: stored.etag };
};

const validateCollection = ({ slug, cover, photos }: Collection, seenSets: Set<string>): void => {
	if (!SLUG.test(slug)) throw new CollectionsValidationError(`Invalid slug "${slug}"`);

	for (const { set } of photos) {
		// Empty segments cover a leading, trailing or doubled slash.
		if (set.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
			throw new CollectionsValidationError(`Invalid set path "${set}"`);
		}
		if (seenSets.has(set)) throw new CollectionsValidationError(`Set "${set}" is listed more than once`);
		seenSets.add(set);
	}

	if (cover !== undefined && !photos.some(({ set }) => set === cover)) {
		throw new CollectionsValidationError(`Cover "${cover}" is not in collection "${slug}"`);
	}
};

export const validateCollections = (file: CollectionsFile): void => {
	const slugs = new Set<string>();
	const sets = new Set<string>();

	for (const collection of file.collections) {
		if (slugs.has(collection.slug)) throw new CollectionsValidationError(`Duplicate slug "${collection.slug}"`);
		slugs.add(collection.slug);
		validateCollection(collection, sets);
	}

	if (Buffer.byteLength(JSON.stringify(file)) > MAX_BYTES) {
		throw new CollectionsValidationError(`Collections file is over ${MAX_BYTES} bytes`);
	}
};

/** Read, apply `change`, validate, copy the current file to history, then write only if nobody wrote since; a lost race re-reads and re-applies. */
export const updateCollections = async (
	change: (file: CollectionsFile) => CollectionsFile,
	location: BucketLocation,
): Promise<CollectionsFile> => {
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const { file, etag } = await readCollections(location);
		const next: CollectionsFile = {
			...change(structuredClone(file)),
			schema: COLLECTIONS_SCHEMA,
			updatedAt: new Date().toISOString(),
		};
		validateCollections(next);

		// Recorded even if the write then loses the race: an extra history copy is harmless, a missing one is not.
		if (etag && !(await copyObject(COLLECTIONS_KEY, `${HISTORY_PREFIX}${next.updatedAt}.json`, etag, location)))
			continue;
		if (await putJson(COLLECTIONS_KEY, JSON.stringify(next), "no-cache", { ifMatch: etag ?? undefined }, location))
			return next;
	}
	throw new CollectionsConflictError(`"${COLLECTIONS_KEY}" kept changing; gave up after ${MAX_ATTEMPTS} attempts`);
};

export const collectionsLocation = (): BucketLocation => {
	const bucketName = process.env.COLLECTIONS_BUCKET;
	if (!bucketName) throw new Error("COLLECTIONS_BUCKET is not set");
	return { bucketName, bucketRegion: defaultRegion };
};

/** A set under a CDN prefix lives in that prefix's bucket, keyed without the prefix; any other set lives in the collections bucket. */
export const locateSet = (set: string): { location: BucketLocation; key: string } => {
	const match = Object.entries(CDN_PREFIXES).find(([, prefix]) => prefix && set.startsWith(prefix));
	if (!match) return { location: collectionsLocation(), key: set };
	return { location: { bucketName: match[0], bucketRegion: defaultRegion }, key: set.slice(match[1].length) };
};
