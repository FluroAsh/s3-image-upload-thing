import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { MANIFEST_PREFIX } from "@/modules/storage/services/manifest";
import {
	type BucketLocation,
	defaultRegion,
	getRegionalClient,
	readManifest,
	readObject,
	storeManifest,
	withDeadline,
} from "@/modules/storage/services/s3-operations";
import { errorMessage } from "@/shared/utils/helpers";

import { parseBackfillArgs } from "./backfill/args";
import { assertImageSets, buildBackfillReport, formatBackfillReport } from "./backfill/report";
import { countFailed, formatSetResult, formatWriteTotals, type ListedObject, writeManifests } from "./backfill/write";

const listObjects = async ({ bucketName, bucketRegion }: BucketLocation, folder?: string): Promise<ListedObject[]> => {
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

	return objects;
};

const main = async (): Promise<void> => {
	const args = parseBackfillArgs(process.argv.slice(2));
	const { bucket, pathPrefix, folder, region } = args;
	const bucketRegion = region ?? defaultRegion;
	const readLocation = { bucketName: bucket, bucketRegion };

	const objects = await listObjects(readLocation, folder);
	const scope = `${bucket}${folder ? ` (folder ${folder})` : ""}`;
	// An empty listing is a wrong bucket, folder or region far more often than an empty bucket.
	if (!objects.length) throw new Error(`No keys found in ${scope}; nothing was written`);

	const report = buildBackfillReport(objects, { pathPrefix });
	assertImageSets(report, scope);
	const manifestRoot = `${MANIFEST_PREFIX}${pathPrefix}`;

	if (!args.write) {
		console.log(
			[
				`Backfill dry run: nothing was written`,
				`Bucket read: ${scope}`,
				`Manifests would go to: ${args.manifestBucket ?? "(no --manifest-bucket given)"} under ${manifestRoot}`,
				"",
				formatBackfillReport(report),
			].join("\n"),
		);
		return;
	}

	const { manifestBucket, force } = args;
	// The only bucket this run writes to, and `storeManifest` refuses any key outside manifests/.
	const manifestLocation = { bucketName: manifestBucket, bucketRegion };
	console.log(
		[
			`Backfill write run${force ? " (--force: manifests of the same set are replaced)" : ""}`,
			`Bucket read: ${scope}, ${objects.length} keys`,
			`Manifests go to: ${manifestBucket} under ${manifestRoot}`,
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
		(result) => console.log(formatSetResult(result)),
	);

	console.log(`\n${formatWriteTotals(results)}`);
	if (countFailed(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
