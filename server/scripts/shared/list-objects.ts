import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { type BucketLocation, getRegionalClient, withDeadline } from "@/modules/storage/services/s3-operations";

import type { ListedObject } from "../backfill/write";

/** How a run names what it covers, in its output and its errors. */
export const scopeLabel = (bucket: string, folder?: string): string =>
	`${bucket}${folder ? ` (folder ${folder})` : ""}`;

export const listObjects = async (
	{ bucketName, bucketRegion }: BucketLocation,
	folder?: string,
): Promise<ListedObject[]> => {
	const objects: ListedObject[] = [];
	// A trailing slash stops `japan` from also matching `japan-2025/`.
	const Prefix = folder ? `${folder}/` : undefined;
	let ContinuationToken: string | undefined;

	do {
		const page = await withDeadline((options) =>
			getRegionalClient(bucketRegion).send(
				new ListObjectsV2Command({ Bucket: bucketName, Prefix, ContinuationToken }),
				options,
			),
		);
		for (const { Key, ETag, Size } of page.Contents ?? []) {
			if (Key) objects.push({ key: Key, etag: ETag ?? "", bytes: Size ?? 0 });
		}
		ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (ContinuationToken);

	// An empty listing is a wrong bucket, folder or region far more often than an empty bucket.
	if (!objects.length) throw new Error(`No keys found in ${scopeLabel(bucketName, folder)}; nothing was written`);

	return objects;
};
