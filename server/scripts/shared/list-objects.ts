import { type BucketLocation, listPages } from "@/modules/storage/services/s3-operations";

import type { ListedObject } from "./listed";

/** How a run names what it covers, in its output and its errors. */
export const scopeLabel = (bucket: string, folder?: string): string =>
	`${bucket}${folder ? ` (folder ${folder})` : ""}`;

export const listAllObjects = async (location: BucketLocation, folder?: string): Promise<ListedObject[]> => {
	const objects: ListedObject[] = [];

	// No overall limit: a run must see every key, and a stalled page still fails on its own deadline.
	await listPages(
		location,
		(page) => {
			for (const { Key, ETag, Size } of page) {
				if (Key) objects.push({ key: Key, etag: ETag ?? "", bytes: Size ?? 0 });
			}
		},
		{ prefix: folder ? `${folder}/` : undefined, timeLimitMs: Number.POSITIVE_INFINITY },
	);

	// An empty listing is a wrong bucket, folder or region far more often than an empty bucket.
	if (!objects.length) throw new Error(`No keys found in ${scopeLabel(location.bucketName, folder)}`);

	return objects;
};
