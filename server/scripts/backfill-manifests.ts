import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";
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
	const { bucket, folder, region, write, force } = parseBackfillArgs(process.argv.slice(2));
	const location = { bucketName: bucket, bucketRegion: region ?? defaultRegion };

	const objects = await listObjects(location, folder);
	const scope = `${bucket}${folder ? ` (folder ${folder})` : ""}`;
	// An empty listing is a wrong bucket, folder or region far more often than an empty bucket.
	if (!objects.length) throw new Error(`No keys found in ${scope}; nothing was written`);

	const report = buildBackfillReport(objects);
	assertImageSets(report, scope);
	const destination = `each nested set's own folder, as ${MANIFEST_FILE_NAME}`;

	if (!write) {
		console.log(
			[
				`Backfill dry run: nothing was written`,
				`Bucket: ${scope}`,
				`Manifests would go to: ${destination}`,
				"",
				formatBackfillReport(report),
			].join("\n"),
		);
		return;
	}

	console.log(
		[
			`Backfill write run${force ? " (--force: existing manifests are replaced)" : ""}`,
			`Bucket: ${scope}, ${objects.length} keys`,
			`Manifests go to: ${destination}`,
			"Measuring every set; this downloads each object once...",
			"",
		].join("\n"),
	);

	// `storeManifest` is the only put this script can reach, and it refuses any key but a set folder's manifest.
	const results = await writeManifests(
		objects,
		{
			readObject: (key) => readObject(key, location),
			readManifest: (set) => readManifest(set, location),
			storeManifest: (manifest, options) => storeManifest(manifest, location, options),
		},
		{ force },
		(result) => console.log(formatSetResult(result)),
	);

	console.log(`\n${formatWriteTotals(results)}`);
	if (countFailed(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
