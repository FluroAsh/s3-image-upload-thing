import { randomBytes } from "node:crypto";

import sharp from "sharp";

import type { VariantOutput } from "@/shared/types/image";
import type { ImageVariant } from "~/shared/types";

type JpegOptions = {
	/** Stored pixel width, before any EXIF rotation. */
	width: number;
	/** Stored pixel height, before any EXIF rotation. */
	height: number;
	/** EXIF orientation tag (1-8); omitted writes none. */
	orientation?: number;
	/** Fill with random pixels, so a WebP re-encode comes out larger than the JPEG. */
	noisy?: boolean;
};

/** Generates a JPEG for pipeline tests. */
export const makeJpeg = async ({ width, height, orientation, noisy }: JpegOptions): Promise<Buffer> => {
	const image = noisy
		? sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).jpeg({ quality: 40 })
		: sharp({ create: { width, height, channels: 3, background: "#c0ffee" } }).jpeg();
	return (orientation ? image.withMetadata({ orientation }) : image).toBuffer();
};

/** Keeps only each variant's width and height, so a test can compare sizes without the bytes. */
export const dimensionsOf = (variants: Partial<Record<ImageVariant, Pick<VariantOutput, "width" | "height">>>) =>
	Object.fromEntries(
		Object.entries(variants).map(([variant, size]) => [variant, { width: size?.width, height: size?.height }]),
	);
