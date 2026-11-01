import type { ApiError } from "@/lib/ofetch";
import { INLINE_VARIANTS } from "~/shared/constants/image-variants";
import type { ImageVariant, TreeNode } from "~/shared/types";

const DEPTH_INDENT_PX = 24;
const DEPTH_BASE_OFFSET_PX = 8;

export const getDepthPadding = (depth: number) => `${depth * DEPTH_INDENT_PX + DEPTH_BASE_OFFSET_PX}px`;

// Extracts the string between "_" and "." (ie: "large_filename.jpg" -> "filename")
export const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1];

export const getVariantType = (fileName: string) => {
	const variant = fileName.split("_")[0];
	return variant ? `${variant[0].toUpperCase()}${variant.slice(1)}` : "";
};

/** Largest inline size first, as `full` is a far bigger download; the icon-sized thumbnail beats only the blurred placeholder. */
export const PREVIEW_ORDER: ImageVariant[] = [...INLINE_VARIANTS.toReversed(), "full", "thumbnail", "placeholder"];

/** Picks the variant to preview; a set may lack any size its source was too small for. */
export const pickPreviewVariant = (variants: TreeNode[]): TreeNode | undefined => {
	for (const wanted of PREVIEW_ORDER) {
		const found = variants.find((variant) => variant.name.startsWith(`${wanted}_`));
		if (found) return found;
	}
};

const qualify = (text: string | undefined, partial: boolean) =>
	text === undefined ? "unknown" : partial ? `at least ${text}` : text;

/** A count with the right plural; `undefined` means it was never counted, and `partial` that it is a lower bound. */
export const formatCount = (count: number | undefined, noun: string | undefined, partial: boolean) =>
	qualify(
		count === undefined ? undefined : noun ? `${count} ${count === 1 ? noun : `${noun}s`}` : String(count),
		partial,
	);

/** A display size such as `"113.09 kB"`; `undefined` means it was never counted, and `partial` that it is a lower bound. */
export const formatSize = (size: string | undefined, partial: boolean) => qualify(size, partial);

/** The server's own `{ error }` text, which says what went wrong, over ofetch's message, which only names the request. */
export const serverErrorMessage = (error: ApiError, fallback: string) => error.data?.error ?? fallback;
