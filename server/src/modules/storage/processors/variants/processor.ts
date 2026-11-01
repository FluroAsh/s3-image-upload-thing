import sharp from "sharp";

import type { OutputOptions } from "@/modules/storage/processors/tools/sharp";
import type { ImageVariants, ProcessedImage, VariantOutput } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";
import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";
import type { ImageVariant } from "~/shared/types";

import { DEFAULT_FILE_TYPE, VARIANT_SPEC } from "./config";

export const ensureBuffer = (buffer: ArrayBuffer | Buffer): Buffer =>
	Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

const getOutputOptions = (variant: ImageVariant): OutputOptions => ({
	quality: VARIANT_SPEC[variant].quality,
	effort: VARIANT_SPEC[variant].effort,
});

/** `full` is the one size every set has, stored at the source's own size when that is below its bound; any other size is skipped rather than upscaled. */
export const planVariants = (sourceLongestEdge: number): ImageVariant[] =>
	IMAGE_VARIANTS.filter((variant) => variant === "full" || VARIANT_SPEC[variant].longestEdge <= sourceLongestEdge);

/** Shared with the backfill, so a blur it makes for an old set matches one an upload would have stored. */
export const encodeVariant = (variant: ImageVariant, source: Buffer) => {
	const bound = VARIANT_SPEC[variant].longestEdge;
	let pipeline = sharp(source)
		.rotate()
		.resize({ width: bound, height: bound, fit: "inside", withoutEnlargement: true })
		.toFormat(DEFAULT_FILE_TYPE, getOutputOptions(variant));

	if (variant === "placeholder") pipeline = pipeline.blur(10);

	return pipeline.toBuffer({ resolveWithObject: true });
};

const createImageVariant = async (variant: ImageVariant, source: ProcessedImage): Promise<VariantOutput> => {
	const { data: buffer, info } = await encodeVariant(variant, ensureBuffer(source.buffer));
	const size = readableSize(buffer.length);

	console.log(`||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${size} ==||`);
	return { buffer, size, width: info.width, height: info.height };
};

/** Creates the variants that fit the source; a size equal to the source's longest edge still differs from the full-size file in encoding. */
export const createImageVariants = async (sourceImage: ProcessedImage): Promise<ImageVariants["variations"]> => {
	const sourceBuffer = ensureBuffer(sourceImage.buffer);
	// `autoOrient` is the size after EXIF rotation; the raw dimensions of a sideways-stored photo are swapped.
	const { autoOrient } = await sharp(sourceBuffer).metadata();

	console.log(
		`||== 📊 "${sourceImage.fileName}" | Source: ${autoOrient.width}x${autoOrient.height} (${readableSize(
			sourceBuffer.length,
		)}) ==||`,
	);

	const outputs = await Promise.all(
		planVariants(Math.max(autoOrient.width, autoOrient.height)).map(
			async (variant) => [variant, await createImageVariant(variant, sourceImage)] as const,
		),
	);

	return Object.fromEntries(outputs);
};
