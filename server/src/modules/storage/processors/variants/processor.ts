import sharp, { type FormatEnum } from "sharp";

import type { OutputOptions } from "@/modules/storage/processors/tools/sharp";
import type { ImageVariants, ProcessedImage, VariantOutput } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";
import type { ImageVariant } from "~/shared/types";

import { VARIANT_EFFORT, VARIANT_NAMES, VARIANT_QUALITY, VARIANT_WIDTH } from "./config";

const ensureBuffer = (buffer: ArrayBuffer | Buffer): Buffer => (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));

const getOutputOptions = (variant: ImageVariant): OutputOptions => {
	const quality = VARIANT_QUALITY[variant];
	const effort = VARIANT_EFFORT[variant];
	if (variant === "placeholder") return { quality, effort };
	if (variant === "lossless") return { quality, effort };
	return { quality, effort };
};

/** A null target width means "source size", which always fits; a sized variant fits only without upscaling. */
export const planVariants = (sourceWidth: number): ImageVariant[] =>
	VARIANT_NAMES.filter((variant) => (VARIANT_WIDTH[variant] ?? 0) <= sourceWidth);

const createImageVariant = async (
	width: number | null,
	variant: ImageVariant,
	source: ProcessedImage,
	sourceMetadata: { width: number; height: number; size: number },
): Promise<VariantOutput> => {
	const outputFormat: keyof FormatEnum = "webp";
	const outputOptions = getOutputOptions(variant);
	const sourceBuffer = ensureBuffer(source.buffer);

	let pipeline = sharp(sourceBuffer).rotate();
	if (variant === "lossless") {
		pipeline = pipeline.toFormat(outputFormat, outputOptions);
	} else {
		pipeline = pipeline
			.resize({ width: width ?? undefined, withoutEnlargement: true })
			.toFormat(outputFormat, outputOptions);
	}

	if (variant === "placeholder") pipeline = pipeline.blur(10);

	const { data: processedBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
	const compressedSize = readableSize(processedBuffer.length);

	if (variant === "lossless" && processedBuffer.length > sourceMetadata.size) {
		console.log(
			`||== ⚠️  "${
				source.fileName
			}" | ${variant} | processed size (${compressedSize}) larger than source (${readableSize(
				sourceMetadata.size,
			)}), using source ==||`,
		);
		return {
			buffer: sourceBuffer,
			size: readableSize(sourceMetadata.size),
			width: sourceMetadata.width,
			height: sourceMetadata.height,
		};
	}

	console.log(`||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${compressedSize} ==||`);
	return { buffer: processedBuffer, size: compressedSize, width: info.width, height: info.height };
};

/** Creates the variants that fit the source, so no two stored files hold the same image. */
export const createImageVariants = async (sourceImage: ProcessedImage): Promise<ImageVariants["variations"]> => {
	const sourceBuffer = ensureBuffer(sourceImage.buffer);
	// `autoOrient` is the size after EXIF rotation; the raw width of a sideways-stored portrait is its height.
	const { autoOrient } = await sharp(sourceBuffer).metadata();
	const sourceMetadata = {
		width: autoOrient.width,
		height: autoOrient.height,
		size: sourceBuffer.length,
	};

	console.log(
		`||== 📊 "${sourceImage.fileName}" | Source: ${sourceMetadata.width}x${
			sourceMetadata.height
		} (${readableSize(sourceMetadata.size)}) ==||`,
	);

	const variants = planVariants(sourceMetadata.width);
	const results = await Promise.all(
		variants.map((variant) => createImageVariant(VARIANT_WIDTH[variant], variant, sourceImage, sourceMetadata)),
	);

	return Object.fromEntries(variants.map((variant, index) => [variant, results[index]]));
};
