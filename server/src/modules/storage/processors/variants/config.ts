import type { ImageVariant } from "~/shared/types";

export const DEFAULT_FILE_TYPE = "webp";
export const DEFAULT_MIME_TYPE = `image/${DEFAULT_FILE_TYPE}`;

type VariantSpec = {
	/** Bound in pixels on the longest edge, keeping the aspect ratio; a smaller source is never upscaled. */
	longestEdge: number;
	/** Output quality (eg. WebP). */
	quality: number;
	/** Sharp effort (compression). */
	effort: number;
};

/** One entry per size, so adding a size is one edit. */
export const VARIANT_SPEC = {
	placeholder: { longestEdge: 20, quality: 60, effort: 4 },
	thumbnail: { longestEdge: 120, quality: 80, effort: 6 },
	small: { longestEdge: 400, quality: 80, effort: 6 },
	medium: { longestEdge: 800, quality: 85, effort: 6 },
	large: { longestEdge: 1440, quality: 90, effort: 6 },
	full: { longestEdge: 3840, quality: 95, effort: 6 },
} as const satisfies Record<ImageVariant, VariantSpec>;
