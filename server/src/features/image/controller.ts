import { Context } from "hono";
import { WithS3Client } from "@/middleware/with-s3-client";
import { createImageVariants, prepareImages } from "./model";
import { uploadImages } from "./service";
import type { ImageVariants, ProcessedImage } from "./types";

// import { readableSize, writeToDesktop } from '@/lib/helpers'
// import { processNefWithDarktable } from '@/infrastructure/image/darktable'
// import sharp from 'sharp'

/**
 * Validates and extracts request body parameters
 * @returns Parsed request body with validated parameters
 */
const parseUploadRequest = async (ctx: Context<WithS3Client>) => {
  const body = await ctx.req.parseBody({ all: true });
  const { bucketName, images, destination = "" } = body;

  if (!bucketName || typeof bucketName !== "string") {
    throw new Error("Bucket name is required");
  }

  if (!images) {
    throw new Error("No images provided");
  }

  const imageArray = Array.isArray(images) ? images : [images];
  const fileEntries = Object.entries(imageArray);

  return {
    bucketName,
    destination: destination as string,
    fileEntries,
  };
};

/**
 * Processes a single source image by creating all variants
 * @param sourceImage - The source image to process
 * @returns Processed image with all variants
 */
const processImage = async (
  sourceImage: ProcessedImage
): Promise<ImageVariants> => {
  const { fieldName, fileName, fileType, size } = sourceImage;

  // TODO: generate AVIF formats and save to bucket as an additional format (for HDR content)
  const variations = await createImageVariants(sourceImage);

  // TODO: Update source buffer with a compressed version of the original RAW ".NEF" image
  // const sourceBuffer = await processNefWithDarktable(
  //   Buffer.isBuffer(sourceImage.buffer) ? sourceImage.buffer : Buffer.from(sourceImage.buffer)
  // )
  //
  // const compressedSource = await sharp(sourceBuffer)
  //   .toFormat('webp', {
  //     quality: 100,
  //     nearLossless: true,
  //     smartSubsample: true,
  //     effort: 6
  //   })
  //   .toColorspace('srgb')
  //   .toBuffer()
  //
  // sourceImage.buffer = compressedSource
  // sourceImage.size = readableSize(compressedSource.length)

  // TODO: Optionally generate a "HDR" variation if "withHDR" is true

  return {
    fieldName,
    fileName,
    fileType,
    size,
    source: sourceImage,
    variations,
  };
};

export const uploadImagesHandler = async (ctx: Context<WithS3Client>) => {
  try {
    const { s3Instance, region } = ctx.var;
    const { bucketName, destination, fileEntries } = await parseUploadRequest(
      ctx
    );

    if (fileEntries.length === 0) {
      return ctx.json({ error: "No files uploaded" }, 400);
    }

    // Prepare images from uploaded files
    const preparedImages = await prepareImages(fileEntries);

    if (preparedImages.length === 0) {
      return ctx.json({ error: "Unable to prepare images" }, 400);
    }

    // Process all images to create variants
    const processedImages = await Promise.all(
      preparedImages.map((image) => processImage(image))
    );

    if (processedImages.length === 0) {
      return ctx.json({ error: "Unable to process images" }, 500);
    }

    // Upload all processed images and their variants to S3
    const uploadResults = await Promise.all(
      processedImages.map((image) =>
        uploadImages(s3Instance, image, {
          format: "webp",
          destination,
          bucketName,
          region,
        })
      )
    );

    // Flatten the results array (each image returns an array of variant uploads)
    const flattenedResults = uploadResults.flat();

    return ctx.json({
      message: "Successfully uploaded images",
      files: flattenedResults,
    });
  } catch (error) {
    console.error("Error in upload process:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during upload";

    return ctx.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      500
    );
  }
};
