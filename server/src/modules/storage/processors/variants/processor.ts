import type { ImageVariant } from "@shared/types";
import sharp, { type FormatEnum } from "sharp";

import type { OutputOptions } from "@/modules/storage/processors/tools/sharp";
import type { ProcessedImage } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";

import { VARIANT_EFFORT, VARIANT_NAMES, VARIANT_QUALITY, VARIANT_WIDTH } from "./config";

const ensureBuffer = (buffer: ArrayBuffer | Buffer): Buffer => (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));

const getOutputOptions = (variant: ImageVariant): OutputOptions => {
	const quality = VARIANT_QUALITY[variant];
	const effort = VARIANT_EFFORT[variant];
	if (variant === "placeholder") return { quality, effort };
	if (variant === "lossless") return { quality, effort };
	return { quality, effort };
};

const createImageVariant = async (
	width: number | null,
	variant: ImageVariant,
	source: ProcessedImage,
	sourceMetadata: { width: number; height: number; size: number },
): Promise<{ buffer: Buffer; size: string } | null> => {
	const outputFormat: keyof FormatEnum = "webp";
	const outputOptions = getOutputOptions(variant);
	const sourceBuffer = ensureBuffer(source.buffer);

	if (width !== null && width > sourceMetadata.width) {
		console.log(
			`||== ⏭️  "${source.fileName}" | ${variant} | skipped (would upscale from ${sourceMetadata.width}px to ${width}px) ==||`,
		);
		return null;
	}

	let pipeline = sharp(sourceBuffer).rotate();
	if (variant === "lossless") {
		pipeline = pipeline.toFormat(outputFormat, outputOptions);
	} else {
		pipeline = pipeline.resize({ width: width!, withoutEnlargement: true }).toFormat(outputFormat, outputOptions);
	}

	if (variant === "placeholder") pipeline = pipeline.blur(10);

	const processedBuffer = await pipeline.toBuffer();
	const compressedSize = readableSize(processedBuffer.length);

	if (variant === "lossless" && processedBuffer.length > sourceMetadata.size) {
		console.log(
			`||== ⚠️  "${
				source.fileName
			}" | ${variant} | processed size (${compressedSize}) larger than source (${readableSize(
				sourceMetadata.size,
			)}), using source ==||`,
		);
		return { buffer: sourceBuffer, size: readableSize(sourceMetadata.size) };
	}

	console.log(`||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${compressedSize} ==||`);
	return { buffer: processedBuffer, size: compressedSize };
};

/**
 * Creates all image variants from a source image using the storage variant config.
 * Uses largest available variant as fallback when a variant is skipped (e.g. upscale).
 */
export const createImageVariants = async (
	sourceImage: ProcessedImage,
): Promise<Record<ImageVariant, { buffer: Buffer; size: string }>> => {
	const sourceBuffer = ensureBuffer(sourceImage.buffer);
	const metadata = await sharp(sourceBuffer).metadata();
	const sourceMetadata = {
		width: metadata.width || 0,
		height: metadata.height || 0,
		size: sourceBuffer.length,
	};

	console.log(
		`||== 📊 "${sourceImage.fileName}" | Source: ${sourceMetadata.width}x${
			sourceMetadata.height
		} (${readableSize(sourceMetadata.size)}) ==||`,
	);

	const variantResults = await Promise.all(
		VARIANT_NAMES.map((variant) => createImageVariant(VARIANT_WIDTH[variant], variant, sourceImage, sourceMetadata)),
	);

	const result: Record<string, { buffer: Buffer; size: string }> = {};
	let largestVariant: { buffer: Buffer; size: string } | null = null;

	VARIANT_NAMES.forEach((variant, index) => {
		const variantResult = variantResults[index];
		if (variantResult) {
			result[variant] = variantResult;
			if (!largestVariant || variantResult.buffer.length > largestVariant.buffer.length) {
				largestVariant = variantResult;
			}
		} else if (largestVariant) {
			console.log(`||== 🔄 "${sourceImage.fileName}" | ${variant} | using fallback (largest available variant) ==||`);
			result[variant] = largestVariant;
		}
	});

	return result as Record<ImageVariant, { buffer: Buffer; size: string }>;
};
