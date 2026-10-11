import { createHash } from "node:crypto";
import { parseArgs } from "node:util";

import sharp from "sharp";

import type { Manifest } from "~/shared/types";

import { DEFAULT_FILE_TYPE } from "../processors/variants/config";
import { encodeVariant } from "../processors/variants/processor";
import { type BucketObject, setLabel } from "./backfill-report";
import {
	assertPathPrefix,
	buildManifest,
	groupImageSets,
	type ImageSet,
	type ManifestLocation,
	manifestKey,
	placeholderDataUri,
	type SetIdentity,
} from "./manifest";
import type { StoreManifestOptions } from "./s3-operations";

export const USAGE = `Usage: bun --env-file=.env scripts/backfill-manifests.ts --bucket <name> [options]

Dry run by default: lists the bucket and prints what a backfill would find. Writes nothing without --write.

  --bucket <name>           Bucket to read (required)
  --prefix <folder>         Limit the run to one folder of the read bucket
  --region <region>         Region of both buckets (default: the server default region)
  --manifest-bucket <name>  Bucket manifests are stored in, under manifests/ only; required with --write
  --path-prefix <prefix>    How the read bucket's keys appear under the CDN host: "" or e.g. "legacy/";
                            must be given with --write, even when empty
  --write                   Measure every set and store its manifest; existing manifests are left alone
  --force                   With --write, replace existing manifests`;

export type BackfillArgs = Pick<Manifest, "pathPrefix"> & {
	/** Bucket the image sets are read from. */
	bucket: string;
	/** Bucket manifests are stored in; always set when `write` is. */
	manifestBucket: string | undefined;
	/** Folder of the read bucket the run is limited to, without a slash at either end; unset for the whole bucket. */
	folder: string | undefined;
	/** Region of both buckets; unset means the server default. */
	region: string | undefined;
	/** Store manifests; `false` is a dry run. */
	write: boolean;
	/** Replace manifests that already exist; only with `write`. */
	force: boolean;
};

/** `argv` is the command line after the script name. Throws with a message for the person running it. */
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
	if (force && !write) fail("--force only applies with --write");
	if (write && !manifestBucket) fail("--write needs --manifest-bucket");
	// A forgotten prefix on the second bucket would store its manifests under the primary bucket's paths.
	if (write && pathPrefix === undefined) fail('--write needs --path-prefix, even when it is empty: --path-prefix ""');
	assertPathPrefix(pathPrefix ?? "");

	return {
		bucket,
		manifestBucket,
		pathPrefix: pathPrefix ?? "",
		folder,
		region,
		write,
		force,
	};
};

export type ListedObject = BucketObject & {
	/** Size of the object in bytes, as listed. */
	bytes: number;
};

/** The bucket requests a write run makes, so the run itself can be tested without the network. */
export type BackfillIo = {
	/** Downloads one object of the read bucket whole. */
	readObject: (key: string) => Promise<Buffer>;
	/** Reads the manifest stored for a set in the manifest bucket; `null` when there is none. */
	readManifest: (location: ManifestLocation) => Promise<Manifest | null>;
	/** Stores a manifest in the manifest bucket; resolves `false`, storing nothing, when one exists and `overwrite` is off. */
	storeManifest: (manifest: Manifest, options: StoreManifestOptions) => Promise<boolean>;
};

export type WriteOptions = Pick<Manifest, "bucket" | "pathPrefix"> & {
	/** Rewrite manifests that already exist. */
	force: boolean;
};

/** Outcomes that leave a set without a new manifest on purpose. */
export const SKIPPED_OUTCOMES = ["exists", "exists-other-set"] as const;

/** Outcomes that mean a set should have a manifest and has none, which make the run exit non-zero. */
export const FAILED_OUTCOMES = ["collision", "unreadable-object", "failed"] as const;

/** What can happen to one image set in a write run. */
export const SET_OUTCOMES = ["written", ...SKIPPED_OUTCOMES, ...FAILED_OUTCOMES] as const;

export type SetOutcome = (typeof SET_OUTCOMES)[number];

export type SetResult = SetIdentity & {
	/** Key the set's manifest is stored under, or would be. */
	manifestKey: string;
	/** What happened to the set. */
	outcome: SetOutcome;
	/** Why, in words for the person running it; absent when there is nothing to add. */
	detail?: string;
};

type Outcome = Pick<SetResult, "outcome" | "detail">;

const sortedKeys = (keys: string[]): string => keys.sort().join(", ");

/** A manifest key can be taken by a set this run never listed, so an existing one is compared, not assumed to be ours. */
const existingOutcome = (existing: Manifest, set: ImageSet, bucket: string): Outcome => {
	const existingKeys = sortedKeys(Object.values(existing.variants).map(({ key }) => key));
	const sameSet =
		existing.layout === set.layout &&
		existing.bucket === bucket &&
		existingKeys === sortedKeys(set.members.map(({ key }) => key));

	if (sameSet) return { outcome: "exists" };
	return {
		outcome: "exists-other-set",
		detail: `existing manifest is a ${existing.layout} set in ${existing.bucket} with keys ${existingKeys}`,
	};
};

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// ponytail: every object is downloaded whole, since the original's hash and the blur need the bytes anyway. Fine for
// buckets of a few thousand small images; move to ranged reads and a streamed hash before pointing this at a large one.
const measureObject = async (
	{ key, variant }: ImageSet["members"][number],
	{ bytes, etag }: ListedObject,
	io: BackfillIo,
) => {
	try {
		const body = await io.readObject(key);
		if (body.length !== bytes) throw new Error(`read ${body.length} bytes, listed as ${bytes}`);
		// `autoOrient` matches how an upload measures: the size as displayed, after any EXIF rotation.
		const { format, autoOrient } = await sharp(body).metadata();
		const sha256 = variant === "original" ? createHash("sha256").update(body).digest("hex") : undefined;

		return { key, variant, body, bytes, etag, sha256, format, ...autoOrient };
	} catch (error) {
		throw new Error(`"${key}": ${message(error)}`);
	}
};

const backfillSet = async (
	set: ImageSet,
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
	{ bucket, pathPrefix, force }: WriteOptions,
): Promise<Outcome> => {
	const existing = force ? null : await io.readManifest({ pathPrefix, ...set });
	if (existing) return existingOutcome(existing, set, bucket);

	let objects: Awaited<ReturnType<typeof measureObject>>[];
	let placeholder: Buffer;
	try {
		objects = await Promise.all(
			set.members.map((member) => measureObject(member, listed.get(member.key) as ListedObject, io)),
		);
		const stored = objects.find(({ variant }) => variant === "placeholder");
		const narrowest = objects.reduce((smallest, object) => (object.width < smallest.width ? object : smallest));
		placeholder = stored?.body ?? (await encodeVariant("placeholder", narrowest.body)).data;
	} catch (error) {
		return { outcome: "unreadable-object", detail: message(error) };
	}

	const manifest = buildManifest({
		bucket,
		pathPrefix,
		createdAt: new Date().toISOString(),
		placeholder: placeholderDataUri(placeholder),
		source: null,
		objects,
	});
	if (await io.storeManifest(manifest, { overwrite: force })) {
		// Uploads once stored the source file itself under a `.webp` key; the manifest says what is there, and so does the run.
		const mislabelled = objects.filter(({ format }) => format !== DEFAULT_FILE_TYPE);
		const detail = mislabelled
			.map(({ variant, format }) => `${variant} holds ${format}, not ${DEFAULT_FILE_TYPE}`)
			.join("; ");
		return { outcome: "written", detail: detail || undefined };
	}

	return { outcome: "exists", detail: "a manifest was stored for it during this run" };
};

/** Sets worked on at once; each downloads its handful of objects together, so requests in flight stay in the low tens. */
const SET_CONCURRENCY = 4;

const mapLimited = async <Item, Result>(
	items: readonly Item[],
	limit: number,
	run: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
	const results: Result[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next++;
			results[index] = await run(items[index]);
		}
	};
	await Promise.all(Array.from({ length: limit }, worker));

	return results;
};

/** Measures every image set in a listing and stores a manifest for each, reporting what happened set by set. */
export const writeManifests = async (
	objects: readonly ListedObject[],
	io: BackfillIo,
	options: WriteOptions,
): Promise<SetResult[]> => {
	const listed = new Map(objects.map((object) => [object.key, object]));
	const targets = groupImageSets(objects.map(({ key }) => key)).sets.map((set) => ({
		set,
		manifestKey: manifestKey({ pathPrefix: options.pathPrefix, ...set }),
	}));

	return mapLimited(targets, SET_CONCURRENCY, async ({ set, manifestKey: target }) => {
		const { members, ...identity } = set;
		// Forced, the later of two colliding sets would silently replace the earlier one's manifest.
		const rivals = targets.filter((other) => other.manifestKey === target && other.set !== set);
		const outcome: Outcome = rivals.length
			? {
					outcome: "collision",
					detail: `shares its manifest key with ${rivals.map((rival) => setLabel(rival.set)).join(", ")}`,
				}
			: await backfillSet(set, listed, io, options).catch(
					(error: unknown): Outcome => ({ outcome: "failed", detail: message(error) }),
				);

		return { ...identity, manifestKey: target, ...outcome };
	});
};

const countOutcomes = (results: readonly SetResult[], outcomes: readonly SetOutcome[]): number =>
	results.filter(({ outcome }) => outcomes.includes(outcome)).length;

/** Number of sets that should have a manifest and have none; the run exits non-zero when it is not 0. */
export const countFailed = (results: readonly SetResult[]): number => countOutcomes(results, FAILED_OUTCOMES);

export const formatWriteReport = (results: readonly SetResult[]): string => {
	const totals = (outcomes: readonly SetOutcome[]) =>
		outcomes.map((outcome) => `  ${outcome}: ${countOutcomes(results, [outcome])}`);

	return [
		...results.map(
			({ outcome, detail, manifestKey: target, ...identity }) =>
				`[${outcome}] ${setLabel(identity)} -> ${target}${detail ? `: ${detail}` : ""}`,
		),
		"",
		`Sets found: ${results.length}`,
		`Written: ${countOutcomes(results, ["written"])}`,
		`Skipped: ${countOutcomes(results, SKIPPED_OUTCOMES)}`,
		...totals(SKIPPED_OUTCOMES),
		`Failed: ${countFailed(results)}`,
		...totals(FAILED_OUTCOMES),
	].join("\n");
};
