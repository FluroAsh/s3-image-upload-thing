import { parseArgs } from "node:util";

import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";
import type { StoreManifestOptions } from "@/modules/storage/services/s3-operations";

import { BUCKET_OPTIONS, type BucketArgs, readBucketArgs, usageError } from "../shared/args";

const USAGE = `Usage: bun --env-file=.env scripts/backfill-manifests.ts --bucket <name> [options]
Runbook: server/docs/runbooks/backfill-manifests.md

Dry run by default: lists the bucket and prints what a backfill would find. Writes nothing without --write.

  --bucket <name>    Bucket whose image sets are read and, with --write, given manifests (required)
  --prefix <folder>  Limit the run to one folder of the bucket
  --region <region>  Region of the bucket (default: the server default region)
  --write            Measure every set and store its manifest as ${MANIFEST_FILE_NAME} inside the set's own folder;
                     existing manifests are left alone, and flat sets (no folder of their own) get none
  --force            With --write, replace the manifest of a set that already has one`;

type BackfillArgs = StoreManifestOptions & BucketArgs;

export const parseBackfillArgs = (argv: string[]): BackfillArgs => {
	const { values } = parseArgs({
		args: argv,
		options: { ...BUCKET_OPTIONS, force: { type: "boolean", default: false } },
	});

	const fail = usageError(USAGE);
	const args = readBucketArgs(values, fail);
	const { force } = values;
	if (force && !args.write) fail("--force only applies with --write");

	return { ...args, force };
};
