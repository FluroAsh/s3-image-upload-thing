/** Every variant a stored image set can hold, smallest first, full size last. */
export const IMAGE_VARIANTS = ["placeholder", "small", "medium", "large", "full"] as const;

/** Sizes a page shows inline, smallest first: not the blurred placeholder, nor `full`, which is for a lightbox. */
export const INLINE_VARIANTS = IMAGE_VARIANTS.filter((variant) => variant !== "placeholder" && variant !== "full");
