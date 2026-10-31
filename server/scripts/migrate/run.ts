import type { NestedSetIdentity, SetIdentity } from "@/modules/storage/services/manifest";
import type { UploadOutcome, UploadRefusal } from "@/modules/storage/services/upload-pipeline";
import { errorMessage } from "@/shared/utils/helpers";

import { setLabel } from "../shared/listed";
import { mapLimited, SET_CONCURRENCY } from "../shared/map-limited";
import { type FlatSetPlan, linkToKey, planFlatSets } from "./plan";

/** The bucket requests a migration makes, so the run itself can be tested without the network. */
export type MigrateIo = {
	/** Whether anything is stored under the set's folder: the check the upload pipeline makes before it stores. */
	setExists: (identity: NestedSetIdentity) => Promise<boolean>;
	/** Downloads one object of the bucket whole. */
	readObject: (key: string) => Promise<Buffer>;
	/** Puts one file through the upload pipeline, which stores its set in a folder of its own inside `destination`. */
	upload: (file: File, destination: string) => Promise<UploadOutcome>;
};

export type MigrateOptions = {
	/** Run the upload pipeline; `false` is a dry run, which reads and stores nothing. */
	write: boolean;
	/** Most sets to put through the pipeline in this run, failures included; unset for no limit. */
	limit?: number;
};

/** Outcomes that leave a set without a new folder on purpose. */
const SKIPPED_OUTCOMES = ["already-migrated", "no-original", "reserved"] as const;

/** Outcomes that mean a set should have been migrated and was not, which make the run exit non-zero. */
const FAILED_OUTCOMES = ["unsafe-target", "failed"] as const;

/** What can happen to one flat set; `to-migrate` is a set this run left as it found it (a dry run, or past `--limit`). */
export const MIGRATE_OUTCOMES = ["migrated", "to-migrate", ...SKIPPED_OUTCOMES, ...FAILED_OUTCOMES] as const;

export type MigrateOutcome = (typeof MIGRATE_OUTCOMES)[number];

export type MigrateResult = SetIdentity &
	Pick<FlatSetPlan, "original" | "setPrefix"> & {
		/** What happened to the set. */
		outcome: MigrateOutcome;
		/** Key site content should link to in the new set; `null` when the set has no new folder. */
		linkTo: string | null;
		/** Why, in words for the person running it; absent when there is nothing to add. */
		detail?: string;
	};

type Verdict = Pick<MigrateResult, "outcome" | "linkTo" | "detail">;

/** How each refusal of the upload pipeline is reported; the listing made both unlikely, so the detail says who decided. */
const PIPELINE_REFUSALS = {
	exists: { outcome: "already-migrated", detail: "the upload pipeline found its folder taken" },
	reserved: { outcome: "reserved", detail: "the upload pipeline refused its folder as reserved" },
} as const satisfies Record<UploadRefusal, Omit<Verdict, "linkTo">>;

/** `claim` answers whether this set may still be put through the pipeline, and counts it if so. */
const migrateSet = async (plan: FlatSetPlan, io: MigrateIo, claim: () => boolean): Promise<Verdict> => {
	if (plan.refusal !== null) return { ...plan.refusal, linkTo: null };
	const { original, fileName, mimeType, folder } = plan;
	if (await io.setExists(plan)) return { outcome: "already-migrated", linkTo: plan.listedLinkTo };

	// Which sizes exist depends on the original's width, which only a download shows, so a set not migrated has no link.
	if (!claim()) return { outcome: "to-migrate", linkTo: null };

	const file = new File([await io.readObject(original)], fileName, { type: mimeType });
	const uploaded = await io.upload(file, folder);
	if ("refused" in uploaded) return { ...PIPELINE_REFUSALS[uploaded.refused], linkTo: null };

	return { outcome: "migrated", linkTo: linkToKey(uploaded.files) };
};

/** Sets finish in any order, so `onResult` hears them as they do; the returned results keep listing order. */
export const migrateFlatSets = async (
	keys: readonly string[],
	io: MigrateIo,
	{ write, limit = Number.POSITIVE_INFINITY }: MigrateOptions,
	onResult?: (result: MigrateResult) => void,
): Promise<MigrateResult[]> => {
	let attempts = 0;
	// Claimed synchronously after each existence check, so concurrent sets can never exceed the limit.
	const claim = () => write && attempts < limit && ++attempts > 0;

	return mapLimited(planFlatSets(keys), SET_CONCURRENCY, async (plan) => {
		const { layout, folder, name, original, setPrefix } = plan;

		const verdict = await migrateSet(plan, io, claim).catch(
			(error: unknown): Verdict => ({ outcome: "failed", linkTo: null, detail: errorMessage(error) }),
		);

		const result = { layout, folder, name, original, setPrefix, ...verdict };
		onResult?.(result);

		return result;
	});
};

/** One line of the mapping file; `linkTo` is set only for `migrated` (what the pipeline stored) and `already-migrated` (what the listing shows). */
export type MappingEntry = Pick<MigrateResult, "setPrefix" | "linkTo" | "outcome"> & {
	/** Key of the flat original that site content links to today. */
	original: string;
};

/** Drives the site content's find-and-replace, so it is sorted by key (code-unit order, not locale) to diff cleanly between runs. */
export const buildMapping = (results: readonly MigrateResult[]): MappingEntry[] =>
	results
		.flatMap(({ original, setPrefix, linkTo, outcome }) => (original ? [{ original, setPrefix, linkTo, outcome }] : []))
		.sort((a, b) => (a.original < b.original ? -1 : 1));

const countOutcomes = (results: readonly MigrateResult[], outcomes: readonly MigrateOutcome[]): number =>
	results.filter(({ outcome }) => outcomes.includes(outcome)).length;

export const countFailedMigrations = (results: readonly MigrateResult[]): number =>
	countOutcomes(results, FAILED_OUTCOMES);

export const formatMigrateResult = ({ outcome, setPrefix, linkTo, detail, ...identity }: MigrateResult): string =>
	`[${outcome}] ${setLabel(identity)} -> ${setPrefix}${linkTo ? ` (link to ${linkTo})` : ""}${detail ? `: ${detail}` : ""}`;

export const formatMigrateTotals = (results: readonly MigrateResult[]): string => {
	const perOutcome = (outcomes: readonly MigrateOutcome[]) =>
		outcomes.map((outcome) => `  ${outcome}: ${countOutcomes(results, [outcome])}`);

	return [
		`Flat sets found: ${results.length}`,
		`Migrated: ${countOutcomes(results, ["migrated"])}`,
		`Left to migrate: ${countOutcomes(results, ["to-migrate"])}`,
		`Skipped: ${countOutcomes(results, SKIPPED_OUTCOMES)}`,
		...perOutcome(SKIPPED_OUTCOMES),
		`Failed: ${countFailedMigrations(results)}`,
		...perOutcome(FAILED_OUTCOMES),
	].join("\n");
};
