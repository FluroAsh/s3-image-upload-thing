import {
	EXTENSION,
	groupImageSets,
	type ImageSet,
	type SetIdentity,
	SKIP_REASONS,
	type SkippedKey,
} from "@/modules/storage/services/manifest";
import type { ImageVariant, Manifest } from "~/shared/types";

export type BucketObject = {
	/** Bucket key of the object. */
	key: string;
	/** S3 ETag as listed, quotes included; only ever compared for equality. */
	etag: string;
};

/** Variants the portfolio always asks for, so a set without one cannot be served whole. */
export const REQUIRED_VARIANTS = ["medium", "large"] as const satisfies readonly ImageVariant[];

/** Image formats that are not WebP, so the classifier skips them and they get no manifest; the report lists them to make that visible. */
export const NON_EXTENSION_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"] as const;

type BackfillReport = {
	/** Number of keys the report was built from. */
	keyCount: number;
	/** Every image set found, in first-seen order. */
	sets: ImageSet[];
	/** Number of image sets of each layout. */
	setsByLayout: Record<Manifest["layout"], number>;
	/** Each distinct mix of variant names within a layout, in first-seen order. */
	variantCombinations: {
		/** Layout of the sets counted here. */
		layout: Manifest["layout"];
		/** Variant names the sets hold, sorted alphabetically; `"original"` is an un-prefixed file. */
		variants: string[];
		/** Number of sets holding exactly these names. */
		count: number;
	}[];
	/** Every key that belongs to no image set, in listing order. */
	skipped: SkippedKey[];
	/** Sets lacking at least one of `REQUIRED_VARIANTS`. */
	missingRequired: (SetIdentity & {
		/** The required variant names the set has no key for. */
		missing: (typeof REQUIRED_VARIANTS)[number][];
	})[];
	/** One entry per ETag held by two or more variant names of the same set, which are then the same file. */
	sharedEtags: (SetIdentity & {
		/** The ETag the variants share, as listed. */
		etag: string;
		/** Variant names stored with that ETag, in listing order. */
		variants: string[];
	})[];
	/** Sets found by reading `NON_EXTENSION_IMAGE_EXTENSIONS` as if they were webp, that hold at least one such key. */
	nonWebpSets: (SetIdentity & {
		/** The skipped non-webp keys, each with the variant name it would hold if its extension were read. */
		members: ImageSet["members"];
		/** Webp keys that share the set's name; empty when the set is non-webp throughout. */
		webpSiblings: (ImageSet["members"][number] & {
			/** Set name and variant the classifier really gives the key, which cannot see its non-webp siblings. */
			classifiedAs: Pick<Manifest, "name"> & Pick<ImageSet["members"][number], "variant">;
		})[];
	})[];
};

const NON_EXTENSION_IMAGE = new RegExp(`\\.(${NON_EXTENSION_IMAGE_EXTENSIONS.join("|")})$`, "i");

const findNonWebpSets = (keys: readonly string[], sets: readonly ImageSet[]): BackfillReport["nonWebpSets"] => {
	// Grouping each image under a webp name applies the classifier's own rules to formats it does not read.
	const keysByWebpName = new Map<string, string[]>();
	for (const key of keys) {
		if (!key.endsWith(EXTENSION) && !NON_EXTENSION_IMAGE.test(key)) continue;
		const webpName = key.replace(NON_EXTENSION_IMAGE, EXTENSION);
		keysByWebpName.set(webpName, [...(keysByWebpName.get(webpName) ?? []), key]);
	}

	const classifiedByKey = new Map(
		sets.flatMap(({ name, members }) => members.map(({ key, variant }) => [key, { name, variant }] as const)),
	);

	return groupImageSets(Array.from(keysByWebpName.keys())).sets.flatMap(
		({ members: webpNamedMembers, ...identity }) => {
			const allMembers = webpNamedMembers.flatMap(({ key: webpName, variant }) =>
				(keysByWebpName.get(webpName) ?? []).map((key) => ({ key, variant })),
			);
			const members = allMembers.filter(({ key }) => !key.endsWith(EXTENSION));
			if (!members.length) return [];

			const webpSiblings = allMembers.flatMap((member) => {
				const classifiedAs = classifiedByKey.get(member.key);
				return classifiedAs ? [{ ...member, classifiedAs }] : [];
			});

			return [{ ...identity, members, webpSiblings }];
		},
	);
};

/** Everything the dry run prints, worked out from a bucket listing alone so it needs no network to test. */
export const buildBackfillReport = (objects: readonly BucketObject[]): BackfillReport => {
	const keys = objects.map(({ key }) => key);
	const { sets, skipped } = groupImageSets(keys);
	const setsByLayout: BackfillReport["setsByLayout"] = { nested: 0, flat: 0 };
	const combinations = new Map<string, BackfillReport["variantCombinations"][number]>();

	const missingRequired: BackfillReport["missingRequired"] = [];
	const sharedEtags: BackfillReport["sharedEtags"] = [];
	const etags = new Map(objects.map(({ key, etag }) => [key, etag]));

	for (const { members, ...identity } of sets) {
		const { layout } = identity;
		setsByLayout[layout] += 1;

		const missing = REQUIRED_VARIANTS.filter((required) => !members.some(({ variant }) => variant === required));
		if (missing.length) missingRequired.push({ ...identity, missing });

		const variantsByEtag = new Map<string, string[]>();
		for (const { key, variant } of members) {
			const etag = etags.get(key) ?? "";
			if (!etag) continue;
			variantsByEtag.set(etag, [...(variantsByEtag.get(etag) ?? []), variant]);
		}
		for (const [etag, sharing] of Array.from(variantsByEtag)) {
			if (sharing.length > 1) sharedEtags.push({ ...identity, etag, variants: sharing });
		}

		const variants = members.map(({ variant }) => variant).sort();
		const id = JSON.stringify([layout, variants]);
		const combination = combinations.get(id) ?? { layout, variants, count: 0 };
		combination.count += 1;
		combinations.set(id, combination);
	}

	return {
		keyCount: objects.length,
		sets,
		setsByLayout,
		variantCombinations: Array.from(combinations.values()),
		skipped,
		missingRequired,
		sharedEtags,
		nonWebpSets: findNonWebpSets(keys, sets),
	};
};

/** Keys that form no set are far more often a wrong folder or bucket than a bucket of non-images, so a run must not look clean. */
export const assertImageSets = ({ sets, keyCount }: BackfillReport, scope: string): void => {
	if (!sets.length) {
		throw new Error(
			`No image sets in ${scope}: its ${keyCount} keys belong to none (see a dry run's skipped list); nothing was written`,
		);
	}
};

/** Said wherever a flat set is reported: it has no folder of its own to hold a manifest. */
export const FLAT_SET_NOTE = "needs migrating into a set folder before it can have a manifest";

export const setLabel = ({ layout, folder, name }: SetIdentity): string =>
	`${layout} ${folder ? `${folder}/` : ""}${name}`;

export const formatBackfillReport = (report: BackfillReport): string => {
	const { skipped, sharedEtags, missingRequired, nonWebpSets } = report;
	const webpSiblingCount = nonWebpSets.reduce((count, { webpSiblings }) => count + webpSiblings.length, 0);

	return [
		`Keys listed: ${report.keyCount}`,
		"",
		"Sets by layout",
		`  nested: ${report.setsByLayout.nested}`,
		`  flat: ${report.setsByLayout.flat}${report.setsByLayout.flat ? ` (each ${FLAT_SET_NOTE})` : ""}`,
		"",
		"Sets by variant names",
		...report.variantCombinations.map(({ layout, variants, count }) => `  ${layout} ${variants.join("+")}: ${count}`),
		"",
		`Skipped keys: ${skipped.length}`,
		...SKIP_REASONS.map((reason) => `  ${reason}: ${skipped.filter((key) => key.reason === reason).length}`),
		...skipped.map(({ key, reason }) => `  [${reason}] ${key}`),
		"",
		`Sets where two variant names share an ETag: ${new Set(sharedEtags.map(setLabel)).size}`,
		...sharedEtags.map((shared) => `  ${setLabel(shared)}: ${shared.variants.join(" = ")} (${shared.etag})`),
		"",
		`Sets missing ${REQUIRED_VARIANTS.join(" or ")}: ${missingRequired.length}`,
		...missingRequired.map((set) => `  ${setLabel(set)}: ${set.missing.join(", ")}`),
		"",
		`Sets with ${NON_EXTENSION_IMAGE_EXTENSIONS.join("/")} members: ${nonWebpSets.length} (webp keys beside them: ${webpSiblingCount})`,
		...nonWebpSets.flatMap((set) => [
			`  ${setLabel(set)}: ${set.members.map(({ variant }) => variant).join(", ")}`,
			...set.webpSiblings.map(
				({ key, classifiedAs }) => `    ${key} is classified as ${classifiedAs.variant} of "${classifiedAs.name}"`,
			),
		]),
	].join("\n");
};
