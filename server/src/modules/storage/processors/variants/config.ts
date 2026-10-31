import type { ImageVariant } from "~/shared/types";

export const DEFAULT_FILE_TYPE = "webp";
export const DEFAULT_MIME_TYPE = `image/${DEFAULT_FILE_TYPE}`;

/** Longest-edge bound in pixels per variant, keeping the aspect ratio; null = no resize (original dimensions). */
export const VARIANT_LONGEST_EDGE = {
	placeholder: 20,
	small: 400,
	medium: 800,
	large: 1440,
	full: null,
} as const satisfies Record<ImageVariant, number | null>;

/** Output quality (eg. WebP) per variant. */
export const VARIANT_QUALITY = {
	placeholder: 60,
	small: 80,
	medium: 85,
	large: 90,
	full: 95,
} as const satisfies Record<ImageVariant, number>;

/** Sharp effort (compression) per variant. */
export const VARIANT_EFFORT = {
	placeholder: 4,
	small: 6,
	medium: 6,
	large: 6,
	full: 6,
} as const satisfies Record<ImageVariant, number>;
