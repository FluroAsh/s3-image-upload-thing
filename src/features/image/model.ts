import {
  IMAGE_VARIANTS,
  IMAGE_WIDTH,
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
 * Gets output options for Sharp based on variant type and photo format
 * @param variant - The image variant being created
 * @param isRawPhoto - Whether the source is a RAW photo format
 * @returns Sharp output options
 */
const getOutputOptions = (
  variant: ImageVariant,
  isRawPhoto: boolean
): OutputOptions => {
  const baseOptions: OutputOptions = { quality: 85 };

  if (!isRawPhoto) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    quality: variant === "thumbnail" ? 80 : 100,
    nearLossless: true, // Perceptually lossless compression
  };
};

/**
 * Creates a single image variant at the specified width
 * @param width - Target width for the variant
 * @param variant - The variant type (thumbnail, medium, large)
 * @param source - The source image to process
 * @param isRawPhoto - Whether the source is a RAW photo format
 * @returns Object containing the processed buffer and size
 */
const createImageVariant = async (
  width: number,
  variant: ImageVariant,
  source: ProcessedImage,
  isRawPhoto: boolean
): Promise<{ buffer: Buffer; size: string }> => {
  const outputFormat: keyof FormatEnum = "webp";
  const outputOptions = getOutputOptions(variant, isRawPhoto);

  // Process RAW photos with Darktable before resizing
  const sourceBuffer = isRawPhoto
    ? await processRawPhoto(source.buffer)
    : source.buffer;

  // TODO: Extract EXIF data and use camera-specific dimensions
  // const exifData = await exifr.parse(new Uint8Array(source.buffer))
  // const { width: cameraWidth } = CAMERA_DIMENSIONS[exifData.model] ?? CAMERA_DIMENSIONS['NIKON Z 50']

  const processedBuffer = await sharp(sourceBuffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .toFormat(outputFormat, outputOptions)
    .toBuffer();

  const compressedSize = readableSize(processedBuffer.length);

  console.log(
    `||== ✅ "${source.fileName}" | ${variant} | successfully compressed image to ${compressedSize} ==||`
  );

  return { buffer: processedBuffer, size: compressedSize };
};

/**
 * Creates all image variants (thumbnail, medium, large) from a source image
 * @param sourceImage - The source image to create variants from
 * @returns Object containing all image variants
 */
export const createImageVariants = async (
  sourceImage: ProcessedImage
): Promise<Record<ImageVariant, { buffer: Buffer; size: string }>> => {
  const isRawPhoto = isRawPhotoFormat(sourceImage);

  // TODO: if image is AVIF, it likely has HDR data - we should process this as an additional variant and return it

  const variants = await Promise.all(
    IMAGE_VARIANTS.map((variant) =>
      createImageVariant(IMAGE_WIDTH[variant], variant, sourceImage, isRawPhoto)
    )
  );

  const [thumbnail, medium, large] = variants;

  return { thumbnail, medium, large };
};
