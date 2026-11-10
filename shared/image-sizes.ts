import { IMAGE_VARIANTS, VARIANT_LONGEST_EDGE, planVariants, type Variant } from "./constants/image-variants";
import type { Manifest, ManifestVariant } from "./types";

/** `notApplicable`: the source is too small for the size; `mismatched`: the file is a copy of a smaller size or smaller than its bound while a larger one exists. */
export const SIZE_STATES = ["present", "missing", "notApplicable", "mismatched"] as const;
export type SizeState = (typeof SIZE_STATES)[number];

export type SizeStatus = {
	/** Size name from the variant table. */
	name: Variant;
	/** What the manifest says about this size. */
	state: SizeState;
	/** The stored file, or `undefined` when the size is missing or not applicable. */
	variant?: ManifestVariant;
	/** Why the size is `mismatched`, e.g. "same file as small"; `undefined` for every other state. */
	reason?: string;
};

const longestEdge = ({ width, height }: Pick<ManifestVariant, "width" | "height">) => Math.max(width, height);

/** Every size in the table with its state, smallest first; the kept original is not a size and stays in `manifest.source`. */
export const sizeStatuses = (manifest: Manifest): SizeStatus[] => {
	const reference = manifest.source ?? manifest.variants.full;
	/** Legacy sets with neither a source nor `full` cannot say what was expected, so every size is. */
	const expected = reference ? planVariants(longestEdge(reference)) : IMAGE_VARIANTS;
	const widest = Math.max(0, ...Object.values(manifest.variants).map(longestEdge));

	return IMAGE_VARIANTS.map((name, index): SizeStatus => {
		const variant = manifest.variants[name];
		if (!variant) return { name, state: expected.includes(name) ? "missing" : "notApplicable" };

		const sameAs = IMAGE_VARIANTS.slice(0, index).find((smaller) => manifest.variants[smaller]?.etag === variant.etag);
		if (sameAs) return { name, state: "mismatched", variant, reason: `same file as ${sameAs}` };

		const bound = VARIANT_LONGEST_EDGE[name];
		if (longestEdge(variant) < bound && longestEdge(variant) < widest)
			return { name, state: "mismatched", variant, reason: `smaller than its ${bound}px bound` };

		return { name, state: "present", variant };
	});
};
