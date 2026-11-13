import { IMAGE_VARIANTS, planVariants, VARIANT_LONGEST_EDGE } from "~/shared/constants/image-variants";
import { setNameOf } from "~/shared/set-name";

import { limitConcurrency } from "./concurrency";
import { HEADER_BYTES, type ImageSize, readImageSize } from "./image-header";

export type PickedFile = {
	/** Stable key for the row; file names can repeat within a selection. */
	id: string;
	/** The browser file, uploaded as is. */
	file: File;
	/** Pixel width after EXIF rotation; `undefined` when neither the header reader nor the browser can read the file, e.g. HEIC in Chrome. */
	width?: number;
	/** Pixel height after EXIF rotation; `undefined` in the same cases as `width`. */
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
	const size =
		readImageSize(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())) ?? (await decodedSize(file));
	return size ? { ...picked, ...size } : picked;
};

/** The slow path for formats the header reader skips; a full decode, so only used when the header gives nothing. */
const decodedSize = async (file: File): Promise<ImageSize | undefined> => {
	try {
		const bitmap = await createImageBitmap(file);
		try {
			return { width: bitmap.width, height: bitmap.height };
		} finally {
			bitmap.close();
		}
	} catch {
		return undefined;
	}
};

/** Shorter edge of a list thumbnail in pixels; twice the 40px slot, for dense screens. */
const THUMB_SHORT_EDGE_PX = 80;

const thumbLimit = limitConcurrency(4);

/** Kept per file so the complete screen reuses what the file list made. */
const thumbnails = new WeakMap<File, Promise<Blob>>();

/** A small JPEG of the file, made at most a few at a time; rejects for a file the browser cannot decode. */
export const thumbnailOf = ({ file, width, height }: PickedFile) => {
	let thumb = thumbnails.get(file);
	if (!thumb) {
		thumb = thumbLimit(async () => {
			const options: ImageBitmapOptions | undefined =
				width && height
					? {
							resizeWidth: Math.max(1, Math.round((width * THUMB_SHORT_EDGE_PX) / Math.min(width, height))),
							resizeHeight: Math.max(1, Math.round((height * THUMB_SHORT_EDGE_PX) / Math.min(width, height))),
							resizeQuality: "medium",
						}
					: undefined;
			const bitmap = await createImageBitmap(file, options);
			try {
				const fit = options ? 1 : THUMB_SHORT_EDGE_PX / Math.min(bitmap.width, bitmap.height);
				const canvas = new OffscreenCanvas(
					Math.max(1, Math.round(bitmap.width * fit)),
					Math.max(1, Math.round(bitmap.height * fit)),
				);
				const context = canvas.getContext("2d");
				if (!context) throw new Error("no 2d context");
				context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
				return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
			} finally {
				bitmap.close();
			}
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
