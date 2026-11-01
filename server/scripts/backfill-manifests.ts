import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";
import { readManifest, readObject, storeManifest } from "@/modules/storage/services/s3-operations";
import { errorMessage } from "@/shared/utils/helpers";

import { parseBackfillArgs } from "./backfill/args";
import { assertImageSets, buildBackfillReport, formatBackfillReport } from "./backfill/report";
import { countFailed, formatSetResult, formatWriteTotals, writeManifests } from "./backfill/write";
import { listAllObjects, scopeLabel } from "./shared/list-objects";
import { guardStall } from "./shared/stall-guard";

const main = async (): Promise<void> => {
	const { location, folder, write, force } = parseBackfillArgs(process.argv.slice(2));

	const objects = await listAllObjects(location, folder);
	const scope = scopeLabel(location.bucketName, folder);

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
	const results = await guardStall((unfinished) =>
		writeManifests(
			objects,
			{
				readObject: (key) => readObject(key, location),
				readManifest: (set) => readManifest(set, location),
				storeManifest: (manifest, options) => storeManifest(manifest, location, options),
			},
			{ force },
			(result) => console.log(formatSetResult(result)),
			unfinished,
		),
	);

	console.log(`\n${formatWriteTotals(results)}`);
	if (countFailed(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
