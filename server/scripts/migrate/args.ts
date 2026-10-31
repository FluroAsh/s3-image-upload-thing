import { parseArgs } from "node:util";

import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";

import { BUCKET_OPTIONS, type BucketArgs, readBucketArgs, usageError } from "../shared/args";
import type { MigrateOptions } from "./run";

const DEFAULT_MAP = "flat-set-mapping.json";

const USAGE = `Usage: bun --env-file=.env scripts/migrate-flat-sets.ts --bucket <name> [options]
Runbook: server/docs/runbooks/migrate-flat-sets.md

Dry run by default: lists the flat image sets the bucket holds and which of them are already migrated. Writes nothing to
the bucket without --write; the mapping file is always written.

  --bucket <name>    Bucket whose flat sets are read and, with --write, given set folders beside them (required)
  --prefix <folder>  Limit the run to one folder of the bucket
  --region <region>  Region of the bucket (default: the server default region)
  --write            Put each flat original through the upload pipeline, creating {folder}/{name}/ with every size,
                     a server-side copy of the original as original.{ext}, and ${MANIFEST_FILE_NAME}; flat files are
                     never changed
  --limit <n>        With --write, migrate at most n sets (for a trial run)
  --map <file>       Where to write the mapping from old original key to new set (default: ./${DEFAULT_MAP})`;

type MigrateArgs = BucketArgs &
	Pick<MigrateOptions, "limit"> & {
		/** Path of the mapping file to write, relative to the current directory unless absolute. */
		map: string;
	};

export const parseMigrateArgs = (argv: string[]): MigrateArgs => {
	const { values } = parseArgs({
		args: argv,
		options: { ...BUCKET_OPTIONS, limit: { type: "string" }, map: { type: "string", default: DEFAULT_MAP } },
	});

	const fail = usageError(USAGE);
	const args = readBucketArgs(values, fail);
	const limit = values.limit === undefined ? undefined : Number(values.limit);
	if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) fail("--limit must be a whole number above 0");
	if (limit !== undefined && !args.write) fail("--limit only applies with --write");

	return { ...args, map: values.map, limit };
};
