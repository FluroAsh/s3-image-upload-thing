import { IMAGE_VARIANTS, VARIANT_LONGEST_EDGE, planVariants } from "./constants/image-variants";
import type { Manifest, ManifestVariant } from "./types";

/** `notApplicable`: the source is too small for the size; `mismatched`: the file is a copy of a smaller size or smaller than its bound while a larger one exists. */
export type SizeState = "present" | "missing" | "notApplicable" | "mismatched";

export type SizeStatus = {
	/** Size name from the variant table. */
	name: (typeof IMAGE_VARIANTS)[number];
	/** What the manifest says about this size. */
	state: SizeState;
	/** The stored file, or `undefined` when the size is missing or not applicable. */
	variant?: ManifestVariant;
};

const longestEdge = ({ width, height }: { width: number; height: number }) => Math.max(width, height);

/** Every size in the table with its state, smallest first; the kept original is not a size and stays in `manifest.source`. */
export const sizeStatuses = (manifest: Manifest): SizeStatus[] => {
	const reference = manifest.source ?? manifest.variants.full;
	// Legacy sets with neither a source nor `full` cannot say what was expected, so every size is.
	const expected = reference ? planVariants(longestEdge(reference)) : IMAGE_VARIANTS;
	const widest = Math.max(0, ...Object.values(manifest.variants).map(longestEdge));

	return IMAGE_VARIANTS.map((name, index) => {
		const variant = manifest.variants[name];
		if (!variant) return { name, state: expected.includes(name) ? "missing" : "notApplicable" };

		const copiesSmaller = IMAGE_VARIANTS.slice(0, index).some(
			(smaller) => manifest.variants[smaller]?.etag === variant.etag,
		);
		const tooNarrow = longestEdge(variant) < VARIANT_LONGEST_EDGE[name] && longestEdge(variant) < widest;
		return { name, state: copiesSmaller || tooNarrow ? "mismatched" : "present", variant };
	});
};
