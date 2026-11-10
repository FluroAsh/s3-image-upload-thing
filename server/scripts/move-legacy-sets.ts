import { parseArgs } from "node:util";

import { MANIFEST_FILE_NAME, manifestKey, NotAManifestError, nestedSetOf } from "@/modules/storage/services/manifest";
import {
	type BucketLocation,
	copyObject,
	listPages,
	readManifest,
	storeManifest,
} from "@/modules/storage/services/s3-operations";
import { errorMessage } from "@/shared/utils/helpers";

import { isManifestKey, LEGACY_PREFIX, legacyKey, moveManifest } from "./legacy/manifest";
import { BUCKET_OPTIONS, readBucketArgs, usageError } from "./shared/args";
import { listAllObjects, scopeLabel } from "./shared/list-objects";
import type { ListedObject } from "./shared/listed";
import { mapLimited, SET_CONCURRENCY } from "./shared/map-limited";

const USAGE = `Usage: bun --env-file=.env scripts/move-legacy-sets.ts --source <name> --bucket <name> [options]
Runbook: server/docs/runbooks/move-legacy-sets.md

Dry run by default: lists what would be copied and checks every source manifest. Copies every object under a top-level folder of the source bucket to
${LEGACY_PREFIX}/<same key> in the destination bucket, server-side, writing each ${MANIFEST_FILE_NAME} last with its
folder and keys moved under ${LEGACY_PREFIX}/. Root-level files are skipped. Nothing is changed in the source.

  --source <name>    Bucket the sets are copied from (required)
  --bucket <name>    Bucket they are copied into (required)
  --prefix <folder>  Limit the run to one top-level folder of the source
  --region <region>  Region of both buckets (default: the server default region)
  --write            Copy; without it nothing is written`;

const OUTCOMES = ["copied", "skipped", "failed"] as const;

type Outcome = (typeof OUTCOMES)[number];

type Counts = Record<Outcome, { objects: number; bytes: number }>;

const newCounts = (): Counts =>
	Object.fromEntries(OUTCOMES.map((outcome) => [outcome, { objects: 0, bytes: 0 }])) as Counts;

const tally = (counts: Counts, outcome: Outcome, { bytes }: ListedObject): void => {
	counts[outcome].objects++;
	counts[outcome].bytes += bytes;
};

const main = async (): Promise<void> => {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { ...BUCKET_OPTIONS, source: { type: "string" } },
	});
	const fail = usageError(USAGE);
	const { location: destination, folder, write } = readBucketArgs(values, fail);
	if (!values.source) return fail("--source is required");
	const source: BucketLocation = { ...destination, bucketName: values.source };
	if (source.bucketName === destination.bucketName) fail("--source and --bucket must be different buckets");

	const listed = await listAllObjects(source, folder);
	// A key without a slash is a flat file at the root, which is not part of any set.
	const inSets = listed.filter(({ key }) => key.includes("/"));
	const sets = new Map<string, ListedObject[]>();
	for (const object of inSets) {
		const set = object.key.slice(0, object.key.indexOf("/"));
		sets.set(set, [...(sets.get(set) ?? []), object]);
	}

	const destinationPrefix = legacyKey(folder ? `${folder}/` : "");
	const present = new Map<string, number>();
	await listPages(
		destination,
		(page) => {
			for (const { Key, Size } of page) if (Key) present.set(Key, Size ?? 0);
		},
		{ prefix: destinationPrefix, timeLimitMs: Number.POSITIVE_INFINITY },
	);

	console.log(
		[
			write ? "Move write run" : "Move dry run: nothing is written to the bucket",
			`Source: ${scopeLabel(source.bucketName, folder)}, ${listed.length} keys listed, ${listed.length - inSets.length} root-level files skipped`,
			`Destination: ${destination.bucketName} under ${destinationPrefix}, ${present.size} keys already there`,
			"",
		].join("\n"),
	);

	const counts = newCounts();

	const copyOne = async (object: ListedObject): Promise<Outcome> => {
		const target = legacyKey(object.key);
		if (present.get(target) === object.bytes) return "skipped";
		if (!write) return "copied";
		if (await copyObject(object.key, target, object.etag, destination, source.bucketName)) return "copied";
		throw new Error(`${target} exists with another size, or the source changed after it was listed`);
	};

	// A manifest already there is left as it is: its size differs from the source's because it was rewritten.
	const moveOneManifest = async (object: ListedObject): Promise<Outcome> => {
		const target = legacyKey(object.key);
		if (present.has(target)) return "skipped";

		const set = nestedSetOf(object.key);
		const stored =
			set &&
			(await readManifest(set, source).catch((error: unknown) => {
				if (error instanceof NotAManifestError) return null;
				throw error;
			}));
		// A file that is only named manifest.json describes no set, so it is copied unchanged like any other object.
		if (!stored) return copyOne(object);
		const moved = moveManifest(stored);
		if (manifestKey(moved) !== target) {
			throw new Error(`its folder and name do not match its location, so it would not describe ${target}`);
		}
		if (!write) return "copied";
		return (await storeManifest(moved, destination)) ? "copied" : "skipped";
	};

	await mapLimited(Array.from(sets), SET_CONCURRENCY, async ([set, objects]) => {
		const setCounts = newCounts();
		const errors: string[] = [];
		const run = async (object: ListedObject, step: (object: ListedObject) => Promise<Outcome>) => {
			try {
				tally(setCounts, await step(object), object);
			} catch (error) {
				tally(setCounts, "failed", object);
				errors.push(`  ${object.key}: ${errorMessage(error)}`);
			}
		};

		for (const object of objects.filter(({ key }) => !isManifestKey(key))) await run(object, copyOne);
		// The manifest goes last so a set is only described once everything it names is there.
		for (const object of objects.filter(({ key }) => isManifestKey(key))) {
			if (setCounts.failed.objects) {
				tally(setCounts, "failed", object);
				errors.push(`  ${object.key}: not written, the set has failed objects`);
			} else await run(object, moveOneManifest);
		}

		for (const outcome of OUTCOMES) {
			counts[outcome].objects += setCounts[outcome].objects;
			counts[outcome].bytes += setCounts[outcome].bytes;
		}
		console.log(
			`[${setCounts.failed.objects ? "failed" : "ok"}] ${set}: ${setCounts.copied.objects} ${write ? "copied" : "to copy"}, ${setCounts.skipped.objects} skipped, ${setCounts.failed.objects} failed`,
		);
		for (const line of errors) console.log(line);
	});

	let destinationCount = 0;
	await listPages(
		destination,
		(page) => {
			destinationCount += page.length;
		},
		{ prefix: destinationPrefix, timeLimitMs: Number.POSITIVE_INFINITY },
	);

	const line = (label: string, { objects, bytes }: Counts[Outcome]) => `${label} ${objects} objects, ${bytes} bytes`;
	const matches = destinationCount === inSets.length;
	console.log(
		[
			"",
			`Sets: ${sets.size}`,
			line(write ? "Copied:" : "To copy:", counts.copied),
			line("Skipped:", counts.skipped),
			line("Failed:", counts.failed),
			`Count check: ${inSets.length} in the source sets, ${destinationCount} under ${destinationPrefix} in the destination${matches ? "" : write ? " (MISMATCH)" : " (a dry run copies nothing)"}`,
		].join("\n"),
	);
	if (counts.failed.objects || (write && !matches)) process.exitCode = 1;
};

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
