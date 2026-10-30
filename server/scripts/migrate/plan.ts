import { VARIANT_WIDTH } from "@/modules/storage/processors/variants/config";
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
import { errorMessage } from "@/shared/utils/helpers";
import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";

/** The widest sized variant first, the full-size file last; never the placeholder, which is a blur shown while an image loads. */
const LINK_PREFERENCE = [
	...IMAGE_VARIANTS.filter((variant) => variant !== "placeholder" && VARIANT_WIDTH[variant] !== null).reverse(),
	...IMAGE_VARIANTS.filter((variant) => VARIANT_WIDTH[variant] === null),
];

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

/** The script's one promise is that it never replaces a flat file, so the pipeline's target is checked against the listing before anything is read. */
export const assertNewSetFolder = (targetPrefix: string, set: NestedSetIdentity, flatKeys: readonly string[]): void => {
	const expected = setKeyPrefix(set);
	if (targetPrefix !== expected) {
		throw new Error(
			`the upload pipeline would store under "${targetPrefix}", which is not the set folder "${expected}"`,
		);
	}

	const inside = flatKeys.find((key) => key.startsWith(targetPrefix));
	if (inside) throw new Error(`flat file "${inside}" is inside "${targetPrefix}", where the new set would be stored`);
};

// ponytail: scans every set per set, which is nothing for a bucket of a few thousand keys; index the sets once if that grows.
export const planFlatSet = ({ members, ...identity }: ImageSet, sets: readonly ImageSet[]): FlatSetPlan => {
	const fileName = `${identity.name}${EXTENSION}`;
	const original = members.find(({ variant }) => variant === "original")?.key ?? null;
	const setPrefix = setKeyPrefix(uploadSetIdentity(identity.folder, fileName));
	const alreadyListed = sets.find((set) => setId(set) === setId({ ...identity, layout: "nested" }));
	const flatKeys = sets.filter((set) => !holdsManifest(set)).flatMap((set) => set.members.map(({ key }) => key));

	const base = { ...identity, fileName, setPrefix, listedLinkTo: linkToKey(alreadyListed?.members ?? []) };

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
	try {
		assertNewSetFolder(setPrefix, identity, flatKeys);
	} catch (error) {
		return { ...base, original, refusal: { outcome: "unsafe-target", detail: errorMessage(error) } };
	}

	return { ...base, original, refusal: null };
};

/** One plan per flat set of a listing, in listing order; nested sets are what a migration produces, so they are left alone. */
export const planFlatSets = (keys: readonly string[]): FlatSetPlan[] => {
	const { sets } = groupImageSets(keys);

	return sets.filter((set) => !holdsManifest(set)).map((set) => planFlatSet(set, sets));
};
