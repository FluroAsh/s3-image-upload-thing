import type { ImageVariant } from "~/shared/types";

export const DEFAULT_FILE_TYPE = "webp";
export const DEFAULT_MIME_TYPE = `image/${DEFAULT_FILE_TYPE}`;

type VariantSpec = {
	/** Output quality (eg. WebP). */
	quality: number;
	/** Sharp effort (compression). */
	effort: number;
};

/** Bounds live in `VARIANT_LONGEST_EDGE` in shared/ so the admin reads them too; `satisfies` keeps both tables complete. */
export const VARIANT_SPEC = {
	placeholder: { quality: 60, effort: 4 },
	thumbnail: { quality: 80, effort: 6 },
	small: { quality: 80, effort: 6 },
	medium: { quality: 85, effort: 6 },
	large: { quality: 90, effort: 6 },
	full: { quality: 95, effort: 6 },
} as const satisfies Record<ImageVariant, VariantSpec>;
