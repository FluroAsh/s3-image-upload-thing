import { parseArgs } from "node:util";

import { paginateListObjectsV2 } from "@aws-sdk/client-s3";

import {
	type BucketObject,
	buildBackfillReport,
	formatBackfillReport,
} from "../src/modules/storage/services/backfill-report";
import { defaultRegion, getRegionalClient } from "../src/modules/storage/services/s3-operations";

const USAGE = `Usage: bun --env-file=.env scripts/backfill-manifests.ts --bucket <name> [options]

Dry run: lists the bucket and prints what a backfill would find. Writes nothing.

  --bucket <name>           Bucket to read (required)
  --manifest-bucket <name>  Bucket manifests belong in; only echoed in a dry run
  --path-prefix <prefix>    How the read bucket's keys appear under the CDN host: "" (default) or e.g. "legacy/"
  --prefix <folder>         Limit the run to one folder of the read bucket
  --region <region>         Region of the read bucket (default: the server default region)`;

const listObjects = async (bucket: string, region: string, folder?: string): Promise<BucketObject[]> => {
	const objects: BucketObject[] = [];
	// A trailing slash stops `japan` from also matching `japan-2025/`.
	const Prefix = folder ? `${folder.replace(/\/+$/, "")}/` : undefined;

	for await (const page of paginateListObjectsV2({ client: getRegionalClient(region) }, { Bucket: bucket, Prefix })) {
		for (const { Key, ETag } of page.Contents ?? []) {
			if (Key) objects.push({ key: Key, etag: ETag ?? "" });
		}
	}

	return objects;
};

const main = async (): Promise<void> => {
	const { values } = parseArgs({
		options: {
			bucket: { type: "string" },
			"manifest-bucket": { type: "string" },
			"path-prefix": { type: "string", default: "" },
			prefix: { type: "string" },
			region: { type: "string", default: defaultRegion },
		},
	});

	const { bucket, region, prefix } = values;
	if (!bucket) throw new Error(`--bucket is required\n\n${USAGE}`);

	const pathPrefix = values["path-prefix"];
	const report = buildBackfillReport(await listObjects(bucket, region, prefix), { pathPrefix });

	console.log(
		[
			`Backfill dry run: nothing was written`,
			`Bucket read: ${bucket}${prefix ? ` (folder ${prefix})` : ""}`,
			`Manifests would go to: ${values["manifest-bucket"] ?? "(no --manifest-bucket given)"} under manifests/${pathPrefix}`,
			"",
			formatBackfillReport(report),
		].join("\n"),
	);
};

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
