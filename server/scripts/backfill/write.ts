import { createHash } from "node:crypto";

import sharp from "sharp";

import { DEFAULT_FILE_TYPE } from "@/modules/storage/processors/variants/config";
import { encodeVariant } from "@/modules/storage/processors/variants/processor";
import {
	buildManifest,
	type ImageSet,
	type ManifestLocation,
	manifestKey,
	placeholderDataUri,
	type SetIdentity,
	setId,
} from "@/modules/storage/services/manifest";
import type { StoreManifestOptions } from "@/modules/storage/services/s3-operations";
import { errorMessage } from "@/shared/utils/helpers";
import type { Manifest } from "~/shared/types";

import { type BucketObject, buildBackfillReport, setLabel } from "./report";

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
	/** Stores a manifest in the manifest bucket; resolves `false`, storing nothing, when one exists and `force` is off. */
	storeManifest: (manifest: Manifest, options: StoreManifestOptions) => Promise<boolean>;
};

export type WriteOptions = Pick<Manifest, "bucket" | "pathPrefix"> & StoreManifestOptions;

/** Outcomes that leave a set without a new manifest on purpose. */
const SKIPPED_OUTCOMES = ["exists", "exists-stale"] as const;

/** Outcomes that mean a set should have a manifest and has none, which make the run exit non-zero. */
const FAILED_OUTCOMES = ["exists-other-set", "collision", "unreadable-object", "failed"] as const;

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

type OutcomeWithDetail = Pick<SetResult, "outcome" | "detail">;

const joinSortedKeys = (keys: readonly string[]): string => [...keys].sort().join(", ");

/** The key pins path prefix, folder and name, so layout and bucket tell an existing manifest's set apart; `null` means replace it. */
const judgeExisting = (existing: Manifest, set: ImageSet, bucket: string, force: boolean): OutcomeWithDetail | null => {
	if (existing.layout !== set.layout || existing.bucket !== bucket) {
		return {
			outcome: "exists-other-set",
			detail: `its manifest key is held by another set, ${setLabel(existing)} in ${existing.bucket}; not replaced`,
		};
	}
	if (force) return null;

	const existingKeys = Object.values(existing.variants).map(({ key }) => key);
	const setKeys = set.members.map(({ key }) => key);
	const added = setKeys.filter((key) => !existingKeys.includes(key));
	const removed = existingKeys.filter((key) => !setKeys.includes(key));
	if (!added.length && !removed.length) return { outcome: "exists" };

	return {
		outcome: "exists-stale",
		detail: `its keys changed since the manifest was written (added: ${joinSortedKeys(added) || "none"}; removed: ${joinSortedKeys(removed) || "none"}); --force will refresh it`,
	};
};

// ponytail: every object is downloaded whole, since the original's hash and the blur need the bytes anyway. Fine for
// buckets of a few thousand small images; move to ranged reads and a streamed hash before pointing this at a large one.
const measureObject = async (
	{ key, variant }: ImageSet["members"][number],
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
) => {
	try {
		const object = listed.get(key);
		if (!object) throw new Error("missing from the listing");
		const { bytes, etag } = object;

		const body = await io.readObject(key);
		if (body.length !== bytes) throw new Error(`read ${body.length} bytes, listed as ${bytes}`);
		// `autoOrient` matches how an upload measures: the size as displayed, after any EXIF rotation.
		const { format, autoOrient } = await sharp(body).metadata();
		const sha256 = variant === "original" ? createHash("sha256").update(body).digest("hex") : undefined;

		return { key, variant, body, bytes, etag, sha256, format, ...autoOrient };
	} catch (error) {
		throw new Error(`"${key}": ${errorMessage(error)}`);
	}
};

const backfillSet = async (
	set: ImageSet,
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
	{ bucket, pathPrefix, force }: WriteOptions,
): Promise<OutcomeWithDetail> => {
	// Read even when forced: a forced run must still not replace another set's manifest.
	const existing = await io.readManifest({ pathPrefix, ...set });
	const verdict = existing && judgeExisting(existing, set, bucket, force);
	if (verdict) return verdict;

	let objects: Awaited<ReturnType<typeof measureObject>>[];
	let placeholder: Buffer;
	try {
		objects = await Promise.all(set.members.map((member) => measureObject(member, listed, io)));
		const stored = objects.find(({ variant }) => variant === "placeholder");
		const narrowest = objects.reduce((smallest, object) => (object.width < smallest.width ? object : smallest));
		placeholder = stored?.body ?? (await encodeVariant("placeholder", narrowest.body)).data;
	} catch (error) {
		return { outcome: "unreadable-object", detail: errorMessage(error) };
	}

	const manifest = buildManifest({
		bucket,
		pathPrefix,
		createdAt: new Date().toISOString(),
		placeholder: placeholderDataUri(placeholder),
		source: null,
		objects,
	});
	if (await io.storeManifest(manifest, { force })) {
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

/** Sets finish in any order, so `onResult` hears them as they do; the returned results keep listing order. */
export const writeManifests = async (
	objects: readonly ListedObject[],
	io: BackfillIo,
	options: WriteOptions,
	onResult?: (result: SetResult) => void,
): Promise<SetResult[]> => {
	const listed = new Map(objects.map((object) => [object.key, object]));
	const { sets, collisions } = buildBackfillReport(objects, options);
	const collidingWith = new Map(
		collisions.flatMap(({ sets: colliding }) => colliding.map((identity) => [setId(identity), colliding] as const)),
	);

	return mapLimited(sets, SET_CONCURRENCY, async (set) => {
		const { members, ...identity } = set;
		const rivals = (collidingWith.get(setId(set)) ?? []).filter((other) => setId(other) !== setId(set));
		// Forced, the later of two colliding sets would silently replace the earlier one's manifest.
		const verdict: OutcomeWithDetail = rivals.length
			? { outcome: "collision", detail: `shares its manifest key with ${rivals.map(setLabel).join(", ")}` }
			: await backfillSet(set, listed, io, options).catch(
					(error: unknown): OutcomeWithDetail => ({ outcome: "failed", detail: errorMessage(error) }),
				);
		const result = { ...identity, manifestKey: manifestKey({ pathPrefix: options.pathPrefix, ...set }), ...verdict };
		onResult?.(result);

		return result;
	});
};

const countOutcomes = (results: readonly SetResult[], outcomes: readonly SetOutcome[]): number =>
	results.filter(({ outcome }) => outcomes.includes(outcome)).length;

export const countFailed = (results: readonly SetResult[]): number => countOutcomes(results, FAILED_OUTCOMES);

export const formatSetResult = ({ outcome, detail, manifestKey: target, ...identity }: SetResult): string =>
	`[${outcome}] ${setLabel(identity)} -> ${target}${detail ? `: ${detail}` : ""}`;

export const formatWriteTotals = (results: readonly SetResult[]): string => {
	const perOutcome = (outcomes: readonly SetOutcome[]) =>
		outcomes.map((outcome) => `  ${outcome}: ${countOutcomes(results, [outcome])}`);

	return [
		`Sets found: ${results.length}`,
		`Written: ${countOutcomes(results, ["written"])}`,
		`Skipped: ${countOutcomes(results, SKIPPED_OUTCOMES)}`,
		...perOutcome(SKIPPED_OUTCOMES),
		`Failed: ${countFailed(results)}`,
		...perOutcome(FAILED_OUTCOMES),
	].join("\n");
};
