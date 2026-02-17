import type { ImageVariant } from "~/shared/types";

export const DEFAULT_FILE_TYPE = "webp";

/**
 * Ordered list of variants produced for each uploaded image.
 * Defines "what" we generate; processor defines "how."
 */
export const VARIANT_NAMES = [
	"placeholder",
	"small",
	"medium",
	"large",
	"lossless",
] as const satisfies readonly ImageVariant[];

/** Target width in pixels per variant; null = no resize (original dimensions). */
export const VARIANT_WIDTH = {
	placeholder: 20,
	small: 400,
	medium: 800,
	large: 1440,
	lossless: null,
} as const satisfies Record<ImageVariant, number | null>;

/** Output quality (eg. WebP) per variant. */
export const VARIANT_QUALITY = {
	placeholder: 60,
	small: 80,
	medium: 85,
	large: 90,
	lossless: 95,
} as const satisfies Record<ImageVariant, number>;

/** Sharp effort (compression) per variant. */
export const VARIANT_EFFORT = {
	placeholder: 4,
	small: 6,
	medium: 6,
	large: 6,
	lossless: 6,
} as const satisfies Record<ImageVariant, number>;
