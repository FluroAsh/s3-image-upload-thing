import { paginateListObjectsV2 } from "@aws-sdk/client-s3";

import { buildBackfillReport, formatBackfillReport } from "../src/modules/storage/services/backfill-report";
import {
	countFailed,
	formatWriteReport,
	type ListedObject,
	parseBackfillArgs,
	writeManifests,
} from "../src/modules/storage/services/backfill-write";
import {
	type BucketLocation,
	defaultRegion,
	getRegionalClient,
	readManifest,
	readObject,
	storeManifest,
} from "../src/modules/storage/services/s3-operations";

const listObjects = async ({ bucketName, bucketRegion }: BucketLocation, folder?: string): Promise<ListedObject[]> => {
	const objects: ListedObject[] = [];
	// A trailing slash stops `japan` from also matching `japan-2025/`.
	const Prefix = folder ? `${folder}/` : undefined;

	for await (const page of paginateListObjectsV2(
		{ client: getRegionalClient(bucketRegion) },
		{ Bucket: bucketName, Prefix },
	)) {
		for (const { Key, ETag, Size } of page.Contents ?? []) {
			if (Key) objects.push({ key: Key, etag: ETag ?? "", bytes: Size ?? 0 });
		}
	}

	return objects;
};

const main = async (): Promise<void> => {
	const { bucket, manifestBucket, pathPrefix, folder, region, write, force } = parseBackfillArgs(process.argv.slice(2));
	const bucketRegion = region ?? defaultRegion;
	const readLocation = { bucketName: bucket, bucketRegion };

	const objects = await listObjects(readLocation, folder);
	const scope = `${bucket}${folder ? ` (folder ${folder})` : ""}`;
	// An empty listing is a wrong bucket, folder or region far more often than an empty bucket.
	if (!objects.length) throw new Error(`No keys found in ${scope}; nothing was written`);

	if (!write || !manifestBucket) {
		console.log(
			[
				`Backfill dry run: nothing was written`,
				`Bucket read: ${scope}`,
				`Manifests would go to: ${manifestBucket ?? "(no --manifest-bucket given)"} under manifests/${pathPrefix}`,
				"",
				formatBackfillReport(buildBackfillReport(objects, { pathPrefix })),
			].join("\n"),
		);
		return;
	}

	// The only bucket this run writes to, and `storeManifest` refuses any key outside manifests/.
	const manifestLocation = { bucketName: manifestBucket, bucketRegion };
	console.log(
		[
			`Backfill write run${force ? " (--force: existing manifests are replaced)" : ""}`,
			`Bucket read: ${scope}, ${objects.length} keys`,
			`Manifests go to: ${manifestBucket} under manifests/${pathPrefix}`,
			"Measuring every set; this downloads each object once...",
			"",
		].join("\n"),
	);

	const results = await writeManifests(
		objects,
		{
			readObject: (key) => readObject(key, readLocation),
			readManifest: (location) => readManifest(location, manifestLocation),
			storeManifest: (manifest, options) => storeManifest(manifest, manifestLocation, options),
		},
		{ bucket, pathPrefix, force },
	);

	console.log(formatWriteReport(results));
	if (countFailed(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
