/** Every size a stored image set can hold, smallest first, full size last; the kept original sits outside this table. */
export const IMAGE_VARIANTS = ["placeholder", "thumbnail", "small", "medium", "large", "full"] as const;

export type Variant = (typeof IMAGE_VARIANTS)[number];

/** Bound in pixels on the longest edge, keeping the aspect ratio; a smaller source is never upscaled. */
export const VARIANT_LONGEST_EDGE = {
	placeholder: 20,
	thumbnail: 120,
	small: 400,
	medium: 800,
	large: 1440,
	full: 3840,
} as const satisfies Record<Variant, number>;

/** `full` is the one size every set has, stored at the source's own size when that is below its bound; any other size is skipped rather than upscaled. */
export const planVariants = (sourceLongestEdge: number): Variant[] =>
	IMAGE_VARIANTS.filter((variant) => variant === "full" || VARIANT_LONGEST_EDGE[variant] <= sourceLongestEdge);

/** Sizes a page shows inline, smallest first: not the blurred placeholder, nor the icon-sized thumbnail, nor `full`, which is for a lightbox. */
export const INLINE_VARIANTS = ["small", "medium", "large"] as const satisfies readonly Variant[];
