import { IMAGE_VARIANTS, planVariants, VARIANT_LONGEST_EDGE } from "~/shared/constants/image-variants";
import { setNameOf } from "~/shared/set-name";

import { limitConcurrency } from "./concurrency";
import { HEADER_BYTES, readImageSize } from "./image-header";

export type PickedFile = {
	/** Stable key for the row; file names can repeat within a selection. */
	id: string;
	/** The browser file, uploaded as is. */
	file: File;
	/** Pixel width; `undefined` when the browser cannot decode the file, e.g. HEIC. */
	width?: number;
	/** Pixel height; `undefined` when the browser cannot decode the file. */
	height?: number;
};

/** A source whose longest edge is below this loses at least one size to the no-upscale rule. */
const SMALL_SOURCE_PX = VARIANT_LONGEST_EDGE.medium;

/** The sizes of the table that are not in `present`. */
export const skippedSizes = (present: readonly string[]) => IMAGE_VARIANTS.filter((name) => !present.includes(name));

/** A counter rather than `crypto.randomUUID()`, which throws outside a secure context such as the plain-HTTP admin. */
let nextId = 0;

export const pickFile = async (file: File): Promise<PickedFile> => {
	const picked = { id: `file-${nextId++}`, file };
	const size = readImageSize(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()));
	return size ? { ...picked, ...size } : picked;
};

/** Shorter edge of a list thumbnail in pixels; twice the 40px slot, for dense screens. */
const THUMB_SHORT_EDGE_PX = 80;

const thumbLimit = limitConcurrency(4);

/** Kept per file so the complete screen reuses what the file list made. */
const thumbnails = new WeakMap<File, Promise<Blob>>();

/** A small JPEG of the file, made at most a few at a time; rejects for a file with no known size. */
export const thumbnailOf = ({ file, width, height }: PickedFile) => {
	let thumb = thumbnails.get(file);
	if (!thumb) {
		thumb = thumbLimit(async () => {
			if (!width || !height) throw new Error("undecodable");
			const scale = THUMB_SHORT_EDGE_PX / Math.min(width, height);
			const bitmap = await createImageBitmap(file, {
				resizeWidth: Math.max(1, Math.round(width * scale)),
				resizeHeight: Math.max(1, Math.round(height * scale)),
				resizeQuality: "medium",
			});
			const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
			canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
			bitmap.close();
			return canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
		});
		thumbnails.set(file, thumb);
	}
	return thumb;
};

/** Amber notes shown before upload; the server's per-file result stays the source of truth. */
export const uploadWarnings = ({ file, width, height }: PickedFile, existingSets: ReadonlySet<string>): string[] => {
	const warnings: string[] = [];
	const longestEdge = width && height ? Math.max(width, height) : undefined;

	if (longestEdge !== undefined && longestEdge < SMALL_SOURCE_PX) {
		const stored = planVariants(longestEdge);
		warnings.push(`source ${longestEdge}px · ${skippedSizes(stored).join(", ")} skipped`);
	}

	const name = setNameOf(file.name);
	if (existingSets.has(name)) warnings.push(`a set named ${name} exists here`);

	return warnings;
};
