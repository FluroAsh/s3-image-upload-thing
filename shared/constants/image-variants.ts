/** Every size a stored image set can hold, smallest first, full size last; the kept original sits outside this table. */
export const IMAGE_VARIANTS = ["placeholder", "thumbnail", "small", "medium", "large", "full"] as const;

/** Sizes a page shows inline, smallest first: not the blurred placeholder, nor the icon-sized thumbnail, nor `full`, which is for a lightbox. */
export const INLINE_VARIANTS = ["small", "medium", "large"] as const satisfies readonly (typeof IMAGE_VARIANTS)[number][];
