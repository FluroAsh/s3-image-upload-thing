import { writeFile } from "node:fs/promises";
import * as path from "node:path";

import { defaultRegion, imageSetExists, readObject } from "@/modules/storage/services/s3-operations";
import { runUploadPipeline } from "@/modules/storage/services/upload-pipeline";
import { errorMessage } from "@/shared/utils/helpers";

import { parseMigrateArgs } from "./migrate/args";
import { buildMapping, countFailed, formatMigrateResult, formatMigrateTotals, migrateFlatSets } from "./migrate/run";
import { listObjects, scopeLabel } from "./shared/list-objects";

const main = async (): Promise<void> => {
	const { bucket, folder, region, write, limit, map } = parseMigrateArgs(process.argv.slice(2));
	const location = { bucketName: bucket, bucketRegion: region ?? defaultRegion };

	const listStarted = performance.now();
	const objects = await listObjects(location, folder);
	const listSeconds = ((performance.now() - listStarted) / 1000).toFixed(1);

	console.log(
		[
			write
				? `Migration write run${limit ? ` (--limit ${limit})` : ""}`
				: "Migration dry run: nothing is written to the bucket",
			`Bucket: ${scopeLabel(bucket, folder)}, ${objects.length} keys listed in ${listSeconds}s`,
			"Flat files are never changed; each migrated set gets a new folder beside them.",
			"",
		].join("\n"),
	);

	// The pipeline's own puts into a new set folder are the only writes; plan.ts refuses any folder a flat file is in.
	const results = await migrateFlatSets(
		objects.map(({ key }) => key),
		{
			setExists: (set) => imageSetExists(set, location),
			readObject: (key) => readObject(key, location),
			upload: (file, destination) => runUploadPipeline({ fileEntries: [["0", file]], destination, ...location }),
		},
		{ write, limit },
		(result) => console.log(formatMigrateResult(result)),
	);

	await writeFile(map, `${JSON.stringify(buildMapping(results), null, "\t")}\n`);
	console.log(`\n${formatMigrateTotals(results)}\nMapping written to ${path.resolve(map)}`);
	if (countFailed(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
