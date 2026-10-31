import { writeFile } from "node:fs/promises";
import * as path from "node:path";

import { getObject, imageSetExists } from "@/modules/storage/services/s3-operations";
import { runUploadPipeline } from "@/modules/storage/services/upload-pipeline";
import { errorMessage } from "@/shared/utils/helpers";

import { parseMigrateArgs } from "./migrate/args";
import {
	buildMapping,
	countFailedMigrations,
	formatMigrateResult,
	formatMigrateTotals,
	migrateFlatSets,
} from "./migrate/run";
import { listObjects, scopeLabel } from "./shared/list-objects";

const main = async (): Promise<void> => {
	const { location, folder, write, limit, map } = parseMigrateArgs(process.argv.slice(2));

	const listStarted = performance.now();
	const objects = await listObjects(location, folder);
	const listSeconds = ((performance.now() - listStarted) / 1000).toFixed(1);

	console.log(
		[
			write
				? `Migration write run${limit ? ` (--limit ${limit})` : ""}`
				: "Migration dry run: nothing is written to the bucket",
			`Bucket: ${scopeLabel(location.bucketName, folder)}, ${objects.length} keys listed in ${listSeconds}s`,
			"Flat files are never changed; each migrated set gets a new folder beside them.",
			"",
		].join("\n"),
	);

	// Writes go only to new set folders; flat files are just read and copied from, and plan.ts refuses any folder that holds one.
	const results = await migrateFlatSets(
		objects.map(({ key }) => key),
		{
			setExists: (set) => imageSetExists(set, location),
			readObject: (key) => getObject(key, location),
			upload: (file, destination) => runUploadPipeline({ fileEntries: [["0", file]], destination, ...location }),
		},
		{ write, limit },
		(result) => console.log(formatMigrateResult(result)),
	);

	await writeFile(map, `${JSON.stringify(buildMapping(results), null, "\t")}\n`);
	console.log(`\n${formatMigrateTotals(results)}\nMapping written to ${path.resolve(map)}`);
	if (countFailedMigrations(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
