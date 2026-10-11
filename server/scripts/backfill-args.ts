import { parseArgs } from "node:util";

import type { WriteOptions } from "../src/modules/storage/services/backfill-write";
import { assertPathPrefix, MANIFEST_PREFIX } from "../src/modules/storage/services/manifest";

const USAGE = `Usage: bun --env-file=.env scripts/backfill-manifests.ts --bucket <name> [options]

Dry run by default: lists the bucket and prints what a backfill would find. Writes nothing without --write.

  --bucket <name>           Bucket to read (required)
  --prefix <folder>         Limit the run to one folder of the read bucket
  --region <region>         Region of both buckets (default: the server default region)
  --manifest-bucket <name>  Bucket manifests are stored in, under ${MANIFEST_PREFIX} only; required with --write
  --path-prefix <prefix>    How the read bucket's keys appear under the CDN host: "" or segments each ending
                            in "/", e.g. "legacy/"; must be given with --write, even when empty. A non-empty
                            prefix marks a second bucket, so its manifests must go to a different --manifest-bucket
  --write                   Measure every set and store its manifest; existing manifests are left alone
  --force                   With --write, replace the manifest of a set that already has one; a manifest that
                            belongs to another set is never replaced`;

type ReadScope = Omit<WriteOptions, "force"> & {
	/** Folder of the read bucket the run is limited to, without a slash at either end; unset for the whole bucket. */
	folder: string | undefined;
	/** Region of both buckets; unset means the server default. */
	region: string | undefined;
};

type BackfillArgs =
	| (ReadScope & {
			/** A dry run: nothing is stored. */
			write: false;
			/** Bucket the manifests would go to, shown in the report; unset when not given. */
			manifestBucket: string | undefined;
	  })
	| (ReadScope &
			WriteOptions & {
				/** Store manifests. */
				write: true;
				/** Bucket manifests are stored in. */
				manifestBucket: string;
			});

export const parseBackfillArgs = (argv: string[]): BackfillArgs => {
	const { values } = parseArgs({
		args: argv,
		options: {
			bucket: { type: "string" },
			"manifest-bucket": { type: "string" },
			"path-prefix": { type: "string" },
			prefix: { type: "string" },
			region: { type: "string" },
			write: { type: "boolean", default: false },
			force: { type: "boolean", default: false },
		},
	});

	const { bucket, region, write, force } = values;
	const manifestBucket = values["manifest-bucket"];
	const pathPrefix = values["path-prefix"];
	const folder = values.prefix?.replace(/\/+$/, "");
	const fail = (problem: string): never => {
		throw new Error(`${problem}\n\n${USAGE}`);
	};

	if (!bucket) return fail("--bucket is required");
	// Keys never start with "/", so such a filter lists nothing and the run would look like a clean one.
	if (folder === "" || folder?.startsWith("/")) {
		fail('--prefix must name a folder without a leading "/", e.g. japan-2025; omit it to run the whole bucket');
	}
	assertPathPrefix(pathPrefix ?? "");

	const scope = { bucket, pathPrefix: pathPrefix ?? "", folder, region };
	if (!write) {
		if (force) fail("--force only applies with --write");
		return { ...scope, manifestBucket, write };
	}

	if (!manifestBucket) return fail("--write needs --manifest-bucket");
	// A forgotten prefix on the second bucket would store its manifests under the primary bucket's paths.
	if (pathPrefix === undefined) fail('--write needs --path-prefix, even when it is empty: --path-prefix ""');
	// The CDN serves manifests/ only from the primary bucket, so the second bucket's manifests cannot be stored beside its own images.
	if (scope.pathPrefix && manifestBucket === bucket) {
		fail(
			`--path-prefix "${pathPrefix}" marks a second bucket, whose manifests belong in the primary bucket: --manifest-bucket must be a different bucket than --bucket`,
		);
	}

	return { ...scope, manifestBucket, write, force };
};
