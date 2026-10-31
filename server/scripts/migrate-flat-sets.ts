import { writeFileSync } from "node:fs";
import * as path from "node:path";

import { getObject, imageSetExists, readManifest } from "@/modules/storage/services/s3-operations";
import { runUploadPipeline } from "@/modules/storage/services/upload-pipeline";
import { errorMessage } from "@/shared/utils/helpers";

import { parseMigrateArgs } from "./migrate/args";
import { countFailedMigrations, formatMigrateResult, formatMigrateTotals, migrateAndMap } from "./migrate/run";
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
	const results = await migrateAndMap(
		objects.map(({ key }) => key),
		{
			setExists: (set) => imageSetExists(set, location),
			hasManifest: async (set) => (await readManifest(set, location)) !== null,
			readObject: (key) => getObject(key, location),
			upload: (file, destination) => runUploadPipeline({ fileEntries: [["0", file]], destination, ...location }),
		},
		{ write, limit },
		(mapping) => writeFileSync(map, `${JSON.stringify(mapping, null, "\t")}\n`),
		(result) => console.log(formatMigrateResult(result)),
	);

	console.log(`\n${formatMigrateTotals(results)}\nMapping written to ${path.resolve(map)}`);
	if (countFailedMigrations(results)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
