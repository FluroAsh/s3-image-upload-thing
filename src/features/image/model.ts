import {
  IMAGE_VARIANTS,
  IMAGE_WIDTH,
  IMAGE_QUALITY,
  PHOTO_FORMATS,
} from "@/lib/constants/image";
import { readableSize } from "@/lib/helpers";
import { getFileType } from "@/lib/utils";
import { processNefWithDarktable } from "@/infrastructure/image/darktable";
import sharp, { type FormatEnum } from "sharp";

import type { OutputOptions } from "./types/sharp";
import type { ImageVariant, ProcessedImage } from "./types";

// import exifr from 'exifr'

/**
 * Prepares uploaded files for processing by converting them to ProcessedImage format
 * @param files - Array of tuples containing field name and file
 * @returns Promise resolving to array of ProcessedImage objects
 */
export const prepareImages = async (
  files: [string, string | File][]
): Promise<ProcessedImage[]> => {
  const processedImages = await Promise.all(
    files.map(async ([fieldName, file]): Promise<ProcessedImage | null> => {
      if (!(file instanceof File)) {
        return null;
      }

      return {
        fieldName,
        buffer: await file.arrayBuffer(),
        fileName: file.name,
        fileType: file.type,
        size: readableSize(file.size),
      };
    })
  );

  return processedImages.filter(
    (image): image is ProcessedImage => image !== null
  );
};

/**
 * Checks if the image is in a RAW photo format that requires special processing
 * @param image - The processed image to check
 * @returns True if the image is in a RAW photo format
 */
export const isRawPhotoFormat = (image: ProcessedImage): boolean => {
  const fileType = getFileType(image.fileName).replace(".", "");
  return PHOTO_FORMATS.includes(fileType);
};

/**
 * Converts buffer to Buffer type if it's an ArrayBuffer
 * @param buffer - The buffer to convert
 * @returns Buffer instance
 */
const ensureBuffer = (buffer: ArrayBuffer | Buffer): Buffer => {
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
};

/**
 * Processes RAW photo format to JPEG using Darktable
 * @param buffer - The raw image buffer
 * @returns Processed buffer
 */
const processRawPhoto = async (
  buffer: ArrayBuffer | Buffer
): Promise<Buffer> => {
  const inputBuffer = ensureBuffer(buffer);
  return await processNefWithDarktable(inputBuffer, { format: "jpeg" });
};

/**
 * Gets output options for Sharp based on variant type
 * @param variant - The image variant being created
 * @returns Sharp output options
 */
const getOutputOptions = (variant: ImageVariant): OutputOptions => {
  const quality = IMAGE_QUALITY[variant];

  // Lossless variant uses near-lossless compression for best quality
  if (variant === "lossless") {
    return {
      quality: 100,
      nearLossless: true, // Perceptually lossless, visually identical
      effort: 6, // Maximum compression effort
    };
  }

  // Placeholder uses lower quality and faster compression
  if (variant === "placeholder") {
    return {
      quality,
      effort: 4, // Faster compression for small placeholder
    };
  }

  // Standard variants
  return {
    quality,
    effort: 6, // Good balance of size and speed
  };
};

/**
 * Creates a single image variant at the specified width
 * @param width - Target width for the variant (null for lossless = no resize)
 * @param variant - The variant type (placeholder, small, medium, large, lossless)
 * @param source - The source image to process
 * @param sourceMetadata - Metadata about the source image (dimensions, size)
 * @param isRawPhoto - Whether the source is a RAW photo format
 * @returns Object containing the processed buffer and size, or null if variant should be skipped
 */
const createImageVariant = async (
  width: number | null,
  variant: ImageVariant,
  source: ProcessedImage,
  sourceMetadata: { width: number; height: number; size: number },
  isRawPhoto: boolean
): Promise<{ buffer: Buffer; size: string } | null> => {
  const outputFormat: keyof FormatEnum = "webp";
  const outputOptions = getOutputOptions(variant);

  // Process RAW photos with Darktable before resizing (skip for now as per requirements)
  const sourceBuffer = ensureBuffer(source.buffer);

  // Skip variants that would upscale the image
  if (width !== null && width > sourceMetadata.width) {
    console.log(
      `||== ⏭️  "${source.fileName}" | ${variant} | skipped (would upscale from ${sourceMetadata.width}px to ${width}px) ==||`
    );
    return null;
  }

  let sharpInstance = sharp(sourceBuffer).rotate(); // Auto-rotate based on EXIF orientation

  // Lossless variant: No resize, preserve original dimensions
  if (variant === "lossless") {
    sharpInstance = sharpInstance.toFormat(outputFormat, outputOptions);
  } else {
    // All other variants: Resize to target width
    sharpInstance = sharpInstance
      .resize({ width: width!, withoutEnlargement: true })
      .toFormat(outputFormat, outputOptions);
  }

  const processedBuffer = await sharpInstance.toBuffer();
  const compressedSize = readableSize(processedBuffer.length);

  // If the processed buffer is larger than source, use the smaller one for lossless
  if (variant === "lossless" && processedBuffer.length > sourceMetadata.size) {
    console.log(
      `||== ⚠️  "${
        source.fileName
      }" | ${variant} | processed size (${compressedSize}) larger than source (${readableSize(
        sourceMetadata.size
      )}), using source ==||`
    );
    // Return the original buffer if it's smaller
    return { buffer: sourceBuffer, size: readableSize(sourceMetadata.size) };
  }

  console.log(
    `||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${compressedSize} ==||`
  );

  return { buffer: processedBuffer, size: compressedSize };
};

/**
 * Creates all image variants (placeholder, small, medium, large, lossless) from a source image
 * @param sourceImage - The source image to create variants from
 * @returns Object containing all image variants (only those that make sense to generate)
 */
export const createImageVariants = async (
  sourceImage: ProcessedImage
): Promise<Record<ImageVariant, { buffer: Buffer; size: string }>> => {
  const isRawPhoto = isRawPhotoFormat(sourceImage);
  const sourceBuffer = ensureBuffer(sourceImage.buffer);

  // Get source image metadata to make intelligent decisions
  const metadata = await sharp(sourceBuffer).metadata();
  const sourceMetadata = {
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: sourceBuffer.length,
  };

  console.log(
    `||== 📊 "${sourceImage.fileName}" | Source: ${sourceMetadata.width}x${
      sourceMetadata.height
    } (${readableSize(sourceMetadata.size)}) ==||`
  );

  // TODO: if image is AVIF, it likely has HDR data - we should process this as an additional variant and return it

  // Generate all 5 variants in parallel
  const variantResults = await Promise.all(
    IMAGE_VARIANTS.map((variant) =>
      createImageVariant(
        IMAGE_WIDTH[variant],
        variant,
        sourceImage,
        sourceMetadata,
        isRawPhoto
      )
    )
  );

  // Build result object, using the largest available variant as fallback for skipped ones
  const result: Record<string, { buffer: Buffer; size: string }> = {};
  let largestVariant: { buffer: Buffer; size: string } | null = null;

  IMAGE_VARIANTS.forEach((variant, index) => {
    const variantResult = variantResults[index];

    if (variantResult) {
      result[variant] = variantResult;
      // Track the largest variant for fallback
      if (
        !largestVariant ||
        variantResult.buffer.length > largestVariant.buffer.length
      ) {
        largestVariant = variantResult;
      }
    } else if (largestVariant) {
      // Use largest available variant as fallback
      console.log(
        `||== 🔄 "${sourceImage.fileName}" | ${variant} | using fallback (largest available variant) ==||`
      );
      result[variant] = largestVariant;
    }
  });

  return result as Record<ImageVariant, { buffer: Buffer; size: string }>;
};
