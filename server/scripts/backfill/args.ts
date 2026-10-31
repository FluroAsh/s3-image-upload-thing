import { parseArgs } from "node:util";

import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";
import type { StoreManifestOptions } from "@/modules/storage/services/s3-operations";

const USAGE = `Usage: bun --env-file=.env scripts/backfill-manifests.ts --bucket <name> [options]
Runbook: server/docs/runbooks/backfill-manifests.md

Dry run by default: lists the bucket and prints what a backfill would find. Writes nothing without --write.

  --bucket <name>    Bucket whose image sets are read and, with --write, given manifests (required)
  --prefix <folder>  Limit the run to one folder of the bucket
  --region <region>  Region of the bucket (default: the server default region)
  --write            Measure every set and store its manifest as ${MANIFEST_FILE_NAME} inside the set's own folder;
                     existing manifests are left alone, and flat sets (no folder of their own) get none
  --force            With --write, replace the manifest of a set that already has one`;

type BackfillArgs = StoreManifestOptions & {
	/** Bucket whose image sets are read and, with `write`, given manifests. */
	bucket: string;
	/** Folder of the bucket the run is limited to, without a slash at either end; unset for the whole bucket. */
	folder: string | undefined;
	/** Region of the bucket; unset means the server default. */
	region: string | undefined;
	/** Store manifests; `false` is a dry run, which stores nothing. */
	write: boolean;
};

export const parseBackfillArgs = (argv: string[]): BackfillArgs => {
	const { values } = parseArgs({
		args: argv,
		options: {
			bucket: { type: "string" },
			prefix: { type: "string" },
			region: { type: "string" },
			write: { type: "boolean", default: false },
			force: { type: "boolean", default: false },
		},
	});

	const { bucket, region, write, force } = values;
	const folder = values.prefix?.replace(/\/+$/, "");
	const fail = (problem: string): never => {
		throw new Error(`${problem}\n\n${USAGE}`);
	};

	if (!bucket) return fail("--bucket is required");
	// Keys never start with "/", so such a filter lists nothing and the run would look like a clean one.
	if (folder === "" || folder?.startsWith("/")) {
		fail('--prefix must name a folder without a leading "/", e.g. japan-2025; omit it to run the whole bucket');
	}
	if (force && !write) fail("--force only applies with --write");

	return { bucket, folder, region, write, force };
};
