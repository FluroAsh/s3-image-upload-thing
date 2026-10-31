import sharp from "sharp";

import { DEFAULT_FILE_TYPE } from "@/modules/storage/processors/variants/config";
import { encodeVariant } from "@/modules/storage/processors/variants/processor";
import {
	buildManifest,
	describeSource,
	groupImageSets,
	holdsManifest,
	type ImageSet,
	manifestKey,
	type NestedSetIdentity,
	NotAManifestError,
	placeholderDataUri,
	type SetIdentity,
} from "@/modules/storage/services/manifest";
import type { StoreManifestOptions } from "@/modules/storage/services/s3-operations";
import { errorMessage } from "@/shared/utils/helpers";
import type { Manifest } from "~/shared/types";

import { type ListedObject, setLabel } from "../shared/listed";
import { mapLimited, SET_CONCURRENCY, type Unfinished } from "../shared/map-limited";
import { FLAT_SET_NOTE } from "./report";

/** The bucket requests a write run makes, so the run itself can be tested without the network. */
export type BackfillIo = {
	/** Downloads one object of the bucket whole. */
	readObject: (key: string) => Promise<Buffer>;
	/** Reads the manifest stored in a set's folder; `null` when there is none, and throws `NotAManifestError` for any other file there. */
	readManifest: (set: NestedSetIdentity) => Promise<Manifest | null>;
	/** Stores a manifest in its set's folder; resolves `false`, storing nothing, when one exists and `force` is off. */
	storeManifest: (manifest: Manifest, options: StoreManifestOptions) => Promise<boolean>;
};

/** Outcomes that leave a set without a new manifest on purpose. */
const SKIPPED_OUTCOMES = ["exists", "exists-stale", "flat-set"] as const;

/** Outcomes that mean a set should have a manifest and has none, which make the run exit non-zero. */
const FAILED_OUTCOMES = ["unreadable-object", "not-a-manifest", "failed"] as const;

/** What can happen to one image set in a write run. */
export const SET_OUTCOMES = ["written", ...SKIPPED_OUTCOMES, ...FAILED_OUTCOMES] as const;

export type SetOutcome = (typeof SET_OUTCOMES)[number];

export type SetResult = SetIdentity & {
	/** Key the set's manifest is stored under, or would be; absent for a flat set, which gets none. */
	manifestKey?: string;
	/** What happened to the set. */
	outcome: SetOutcome;
	/** Why, in words for the person running it; absent when there is nothing to add. */
	detail?: string;
};

type OutcomeWithDetail = Pick<SetResult, "outcome" | "detail">;

const joinSortedKeys = (keys: readonly string[]): string => [...keys].sort().join(", ");

/** The manifest sits in the set's own folder, so it can only be this set's: the question is whether it still lists the set's files. */
const judgeExisting = (existing: Manifest, set: ImageSet): OutcomeWithDetail => {
	const existingKeys = Object.values(existing.variants).map(({ key }) => key);
	const setKeys = set.members.map(({ key }) => key);
	const added = setKeys.filter((key) => !existingKeys.includes(key));
	const removed = existingKeys.filter((key) => !setKeys.includes(key));
	const recordedSource = existing.source?.key ?? "none";
	const foundSource = set.source ?? "none";

	const changes = [
		...(added.length || removed.length
			? [
					`its keys changed since the manifest was written (added: ${joinSortedKeys(added) || "none"}; removed: ${joinSortedKeys(removed) || "none"})`,
				]
			: []),
		...(recordedSource !== foundSource ? [`its source is ${foundSource}, recorded as ${recordedSource}`] : []),
	];
	if (!changes.length) return { outcome: "exists" };

	return { outcome: "exists-stale", detail: `${changes.join("; ")}; --force will refresh it` };
};

/** Names the key in any failure of `work`, so the run's report says which object it was. */
const aboutKey = <Result>(key: string, work: Promise<Result>): Promise<Result> =>
	work.catch((error: unknown) => {
		throw new Error(`"${key}": ${errorMessage(error)}`);
	});

/** Reads one listed object whole, naming its key in any failure and refusing bytes that no longer match the listing. */
const readListed = async (key: string, listed: ReadonlyMap<string, ListedObject>, io: BackfillIo) => {
	const object = listed.get(key);
	if (!object) throw new Error(`"${key}": missing from the listing`);

	const body = await aboutKey(key, io.readObject(key));
	if (body.length !== object.bytes) throw new Error(`"${key}": read ${body.length} bytes, listed as ${object.bytes}`);

	return { ...object, body };
};

// ponytail: every object is downloaded whole to be measured, though only the blur's source needs all its bytes. Fine for
// buckets of a few thousand small images; move to ranged reads before pointing this at a large one.
const measureObject = async (
	{ key, variant }: ImageSet["members"][number],
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
) => {
	const { body, bytes, etag } = await readListed(key, listed, io);
	// `autoOrient` matches how an upload measures: the size as displayed, after any EXIF rotation.
	const { format, autoOrient } = await aboutKey(key, sharp(body).metadata());

	return { key, variant, body, bytes, etag, format, ...autoOrient };
};

/** A forced run keeps the recorded source while it is still the set's original, so its hash is never recomputed from a re-read. */
const sourceOf = async (
	set: ImageSet,
	existing: Manifest | null,
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
): Promise<Manifest["source"]> => {
	if (!set.source) return null;
	if (existing?.source?.key === set.source) return existing.source;

	const { body } = await readListed(set.source, listed, io);
	return aboutKey(set.source, describeSource(set.source, body));
};

const backfillSet = async (
	set: ImageSet,
	listed: ReadonlyMap<string, ListedObject>,
	io: BackfillIo,
	{ force }: StoreManifestOptions,
): Promise<OutcomeWithDetail> => {
	if (!holdsManifest(set)) return { outcome: "flat-set", detail: FLAT_SET_NOTE };

	let existing: Manifest | null;
	try {
		existing = await io.readManifest(set);
	} catch (error) {
		if (error instanceof NotAManifestError) return { outcome: "not-a-manifest", detail: error.message };
		throw error;
	}
	if (existing && !force) return judgeExisting(existing, set);

	let objects: Awaited<ReturnType<typeof measureObject>>[];
	let placeholder: Buffer;
	let source: Manifest["source"];
	try {
		source = await sourceOf(set, existing, listed, io);
		objects = await Promise.all(set.members.map((member) => measureObject(member, listed, io)));
		const stored = objects.find(({ variant }) => variant === "placeholder");
		const narrowest = objects.reduce((smallest, object) => (object.width < smallest.width ? object : smallest));
		placeholder = stored?.body ?? (await encodeVariant("placeholder", narrowest.body)).data;
	} catch (error) {
		return { outcome: "unreadable-object", detail: errorMessage(error) };
	}

	const manifest = buildManifest({
		createdAt: new Date().toISOString(),
		placeholder: placeholderDataUri(placeholder),
		source,
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

/** Sets finish in any order, so `onResult` hears them as they do; the returned results keep listing order. */
export const writeManifests = async (
	objects: readonly ListedObject[],
	io: BackfillIo,
	options: StoreManifestOptions,
	onResult?: (result: SetResult) => void,
	unfinished?: Unfinished<SetIdentity>,
): Promise<SetResult[]> => {
	const listed = new Map(objects.map((object) => [object.key, object]));
	const { sets } = groupImageSets(objects.map(({ key }) => key));

	return mapLimited(
		sets,
		SET_CONCURRENCY,
		async (set) => {
			const { members, ...identity } = set;
			const verdict = await backfillSet(set, listed, io, options).catch(
				(error: unknown): OutcomeWithDetail => ({ outcome: "failed", detail: errorMessage(error) }),
			);
			const result = { ...identity, ...(holdsManifest(set) && { manifestKey: manifestKey(set) }), ...verdict };
			onResult?.(result);

			return result;
		},
		unfinished,
	);
};

const countOutcomes = (results: readonly SetResult[], outcomes: readonly SetOutcome[]): number =>
	results.filter(({ outcome }) => outcomes.includes(outcome)).length;

export const countFailed = (results: readonly SetResult[]): number => countOutcomes(results, FAILED_OUTCOMES);

export const formatSetResult = ({ outcome, detail, manifestKey: target, ...identity }: SetResult): string =>
	`[${outcome}] ${setLabel(identity)}${detail ? `: ${detail}` : ""}${target ? ` -> ${target}` : ""}`;

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
