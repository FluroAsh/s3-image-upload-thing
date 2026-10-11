import sharp, { type FormatEnum } from "sharp";

import type { OutputOptions } from "@/modules/storage/processors/tools/sharp";
import type { ImageVariants, ProcessedImage, VariantOutput } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";
import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";
import type { ImageVariant } from "~/shared/types";

import { VARIANT_EFFORT, VARIANT_QUALITY, VARIANT_WIDTH } from "./config";

const ensureBuffer = (buffer: ArrayBuffer | Buffer): Buffer => (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));

const getOutputOptions = (variant: ImageVariant): OutputOptions => ({
	quality: VARIANT_QUALITY[variant],
	effort: VARIANT_EFFORT[variant],
});

/** A null target width means "source size", which always fits; a sized variant fits only without upscaling. */
export const planVariants = (sourceWidth: number): ImageVariant[] =>
	IMAGE_VARIANTS.filter((variant) => (VARIANT_WIDTH[variant] ?? 0) <= sourceWidth);

const createImageVariant = async (variant: ImageVariant, source: ProcessedImage): Promise<VariantOutput> => {
	const outputFormat: keyof FormatEnum = "webp";
	const outputOptions = getOutputOptions(variant);

	let pipeline = sharp(ensureBuffer(source.buffer)).rotate();
	if (variant !== "lossless") {
		pipeline = pipeline.resize({ width: VARIANT_WIDTH[variant] ?? undefined, withoutEnlargement: true });
	}
	pipeline = pipeline.toFormat(outputFormat, outputOptions);

	if (variant === "placeholder") pipeline = pipeline.blur(10);

	const { data: buffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
	const size = readableSize(buffer.length);

	console.log(`||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${size} ==||`);
	return { buffer, size, width: info.width, height: info.height };
};

/** Creates the variants that fit the source; a size equal to the source width still differs from the full-size file in encoding. */
export const createImageVariants = async (sourceImage: ProcessedImage): Promise<ImageVariants["variations"]> => {
	const sourceBuffer = ensureBuffer(sourceImage.buffer);
	// `autoOrient` is the size after EXIF rotation; the raw width of a sideways-stored portrait is its height.
	const { autoOrient } = await sharp(sourceBuffer).metadata();

	console.log(
		`||== 📊 "${sourceImage.fileName}" | Source: ${autoOrient.width}x${autoOrient.height} (${readableSize(
			sourceBuffer.length,
		)}) ==||`,
	);

	const outputs = await Promise.all(
		planVariants(autoOrient.width).map(
			async (variant) => [variant, await createImageVariant(variant, sourceImage)] as const,
		),
	);

	return Object.fromEntries(outputs);
};
