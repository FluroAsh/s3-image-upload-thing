import * as path from "node:path";

import { DEFAULT_FILE_TYPE, DEFAULT_MIME_TYPE } from "@/modules/storage/processors/variants/config";
import {
	EXTENSION,
	groupImageSets,
	hasRefusedUploadPrefix,
	holdsManifest,
	type ImageSet,
	type NestedSetIdentity,
	type SetIdentity,
	setId,
	setKeyPrefix,
	uploadSetIdentity,
} from "@/modules/storage/services/manifest";
import { INLINE_VARIANTS } from "~/shared/constants/image-variants";

import { findNonWebpSets, type NON_WEBP_EXTENSIONS } from "../shared/non-webp-sets";

const LINK_PREFERENCE = INLINE_VARIANTS.toReversed();

/** What a flat original's extension says it holds, since the pipeline reads the type from the file it is handed. */
const MIME_BY_EXTENSION = {
	[DEFAULT_FILE_TYPE]: DEFAULT_MIME_TYPE,
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
} as const satisfies Record<typeof DEFAULT_FILE_TYPE | (typeof NON_WEBP_EXTENSIONS)[number], string>;

const mimeTypeOf = (fileName: string): string =>
	MIME_BY_EXTENSION[path.extname(fileName).slice(1).toLowerCase() as keyof typeof MIME_BY_EXTENSION] ??
	DEFAULT_MIME_TYPE;

/** The key site content should link to, of the keys a set holds; `null` when it holds none worth linking. */
export const linkToKey = (members: ImageSet["members"]): string | null => {
	const preferred = LINK_PREFERENCE.find((variant) => members.some((member) => member.variant === variant));
	return members.find(({ variant }) => variant === preferred)?.key ?? null;
};

/** Why a flat set is not migrated, decided from the listing alone, before any request is made for it. */
export const PLAN_REFUSALS = ["no-original", "reserved", "unsafe-target"] as const;

export type FlatSetPlan = SetIdentity & {
	/** File name the original is handed to the upload pipeline under, which names the new set. */
	fileName: string;
	/** Type of the original's bytes, from its extension. */
	mimeType: string;
	/** Key prefix of the set folder the pipeline stores into, ending in a slash. */
	setPrefix: string;
	/** Key to link to among those already listed in that folder; `null` when the listing shows none. */
	listedLinkTo: string | null;
} & (
		| {
				/** Key of the flat set's un-prefixed file, which is read and never written. */
				original: string;
				/** `null` for a set that may be migrated. */
				refusal: null;
		  }
		| {
				/** Key of the flat set's un-prefixed file; `null` when it has none. */
				original: string | null;
				/** Why the set must not be migrated. */
				refusal: {
					/** Which rule refused the set. */
					outcome: (typeof PLAN_REFUSALS)[number];
					/** The reason, in words for the person running the script. */
					detail: string;
				};
		  }
	);

/** The script's one promise is that it never replaces a flat file, so the pipeline's target is checked against the listing before anything is read. Returns why it is unsafe, or nothing. */
export const refuseUnsafeSetFolder = (
	targetPrefix: string,
	set: NestedSetIdentity,
	flatKeys: readonly string[],
): string | undefined => {
	const expected = setKeyPrefix(set);
	if (targetPrefix !== expected) {
		return `the upload pipeline would store under "${targetPrefix}", which is not the set folder "${expected}"`;
	}

	const inside = flatKeys.find((key) => key.startsWith(targetPrefix));
	if (inside) return `flat file "${inside}" is inside "${targetPrefix}", where the new set would be stored`;
};

// ponytail: scans every set per set, which is nothing for a bucket of a few thousand keys; index the sets once if that grows.
export const planFlatSet = (identity: SetIdentity, original: string | null, sets: readonly ImageSet[]): FlatSetPlan => {
	const fileName = original ? path.posix.basename(original) : `${identity.name}${EXTENSION}`;
	const setPrefix = setKeyPrefix(uploadSetIdentity(identity.folder, fileName));
	const alreadyListed = sets.find((set) => setId(set) === setId({ ...identity, layout: "nested" }));
	const flatKeys = sets.filter((set) => !holdsManifest(set)).flatMap((set) => set.members.map(({ key }) => key));

	const base = {
		...identity,
		fileName,
		mimeType: mimeTypeOf(fileName),
		setPrefix,
		listedLinkTo: linkToKey(alreadyListed?.members ?? []),
	};

	if (original === null) {
		return {
			...base,
			original,
			refusal: { outcome: "no-original", detail: "it has no un-prefixed file to make the sizes from" },
		};
	}
	if (hasRefusedUploadPrefix(setPrefix)) {
		return { ...base, original, refusal: { outcome: "reserved", detail: `uploads are refused under "${setPrefix}"` } };
	}
	const unsafe = refuseUnsafeSetFolder(setPrefix, identity, flatKeys);
	if (unsafe) return { ...base, original, refusal: { outcome: "unsafe-target", detail: unsafe } };

	return { ...base, original, refusal: null };
};

/**
 * One plan per flat original of a listing: webp ones first, then jpg, jpeg and png ones, each in listing order.
 * Nested sets are what a migration produces, so they are left alone. An original whose set folder an earlier one already claims is refused, so two files never share a folder.
 */
export const planFlatSets = (keys: readonly string[]): FlatSetPlan[] => {
	const { sets } = groupImageSets(keys);
	const originals = [
		...sets.filter((set) => !holdsManifest(set)),
		...findNonWebpSets(keys, sets).filter((set) => !holdsManifest(set)),
	].flatMap(({ members, layout, folder, name }) => {
		const identity = { layout, folder, name };
		const keysOfOriginals = members.filter(({ variant }) => variant === "original").map(({ key }) => key);
		return (keysOfOriginals.length ? keysOfOriginals : [null]).map((original) => ({ identity, original }));
	});

	const claimedBy = new Map<string, string>();

	return originals.map(({ identity, original }) => {
		const plan = planFlatSet(identity, original, sets);
		const first = claimedBy.get(plan.setPrefix);
		if (original === null || plan.refusal !== null) return plan;
		if (first === undefined) {
			claimedBy.set(plan.setPrefix, original);
			return plan;
		}

		return {
			...plan,
			refusal: {
				outcome: "unsafe-target",
				detail: `"${original}" and "${first}" would both be stored in "${plan.setPrefix}"; only the first is migrated`,
			},
		};
	});
};
