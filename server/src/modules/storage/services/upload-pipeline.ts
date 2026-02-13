import type { S3Client } from "@aws-sdk/client-s3";

import type { FileVariant } from "@shared/types";
import type { ImageVariants, ProcessedImage } from "@/shared/types/image";

import { createImageVariants, prepareImages } from "./image-processing";
import { uploadImages } from "./s3-operations";

export type UploadPipelineParams = {
  fileEntries: [string, string | File][];
  bucketName: string;
  destination: string;
  s3Instance: S3Client;
  region: string;
};

/**
 * Builds ImageVariants from a single ProcessedImage (prepare → variants shape).
 * Kept in pipeline as orchestration glue between image-processing and S3 upload.
 */
const processImage = async (
  sourceImage: ProcessedImage,
): Promise<ImageVariants> => {
  const { fieldName, fileName, fileType, size } = sourceImage;
  const variations = await createImageVariants(sourceImage);

  /**
   * TODO:
   * - Generate AVIF formats (HDR) and save to bucket as an additional format when "withHDR" param is true
   * - This requires a separate image processing step before uploading to S3
   *   see: https://sharp.pixelplumbing.com/api-output/#avif
   */

  return {
    fieldName,
    fileName,
    fileType,
    size,
    source: sourceImage,
    variations,
  };
};

/**
 * Runs the full upload pipeline: prepare files → create variants → upload to S3.
 * Returns a flat list of upload results (one per variant per image).
 */
export const runUploadPipeline = async (
  params: UploadPipelineParams,
): Promise<FileVariant[]> => {
  const { fileEntries, bucketName, destination, s3Instance, region } = params;

  const preparedImages = await prepareImages(fileEntries);
  const processedImages = await Promise.all(
    preparedImages.map((image) => processImage(image)),
  );

  const uploadResults = await Promise.all(
    processedImages.map((image) =>
      uploadImages(s3Instance, image, {
        format: "webp",
        destination,
        bucketName,
        region,
      }),
    ),
  );

  return uploadResults.flat();
};
