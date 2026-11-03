import type { Collection, CollectionsFile } from "~/shared/types";

import { type BucketLocation, copyObject, getObjectOrNull, putJsonIfMatch } from "./s3-operations";

export const COLLECTIONS_KEY = "gallery/collections.json";
const HISTORY_PREFIX = "gallery/history/collections-";
const MAX_ATTEMPTS = 3;
const MAX_BYTES = 1_000_000;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CollectionsValidationError extends Error {}
export class CollectionsConflictError extends Error {}

/** `{"bucket-name":"legacy/"}`; a bucket not listed serves from the CDN root. */
const cdnPrefixes = (): Record<string, string> => JSON.parse(process.env.BUCKET_CDN_PREFIXES ?? "{}");

/** Turns a set's bucket key into the CDN path collections record. */
export const setCdnPath = (bucketName: string, key: string): string => `${cdnPrefixes()[bucketName] ?? ""}${key}`;

const emptyFile = (): CollectionsFile => ({ schema: 1, updatedAt: new Date(0).toISOString(), collections: [] });

export const readCollections = async (
	location: BucketLocation,
): Promise<{ file: CollectionsFile; etag: string | null }> => {
	const stored = await getObjectOrNull(COLLECTIONS_KEY, location);
	if (!stored) return { file: emptyFile(), etag: null };

	const file = JSON.parse(stored.body.toString("utf8")) as CollectionsFile;
	if (file.schema !== 1) throw new Error(`"${COLLECTIONS_KEY}" has unknown schema ${String(file.schema)}`);
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
		const next: CollectionsFile = { ...change(structuredClone(file)), schema: 1, updatedAt: new Date().toISOString() };
		validateCollections(next);

		// Recorded even if the write then loses the race: an extra history copy is harmless, a missing one is not.
		if (etag && !(await copyObject(COLLECTIONS_KEY, `${HISTORY_PREFIX}${next.updatedAt}.json`, etag, location)))
			continue;
		if ((await putJsonIfMatch(COLLECTIONS_KEY, JSON.stringify(next), etag, location)) !== null) return next;
	}
	throw new CollectionsConflictError(`"${COLLECTIONS_KEY}" kept changing; gave up after ${MAX_ATTEMPTS} attempts`);
};
