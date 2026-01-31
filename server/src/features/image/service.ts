import { DEFAULT_FILE_TYPE } from "@/lib/constants/image";
import { type ImageVariants } from "./types";

import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type FormatEnum } from "sharp";
import * as path from "path";
import { TIME } from "@/lib/constants";

/**
 * Generates a presigned URL for secure, temporary access to S3 objects
 * Works with private buckets without requiring bucket policy changes
 * URLs expire after 1 hour
 */
const generatePresignedUrl = async (
  s3Instance: S3Client,
  bucketName: string,
  key: string
): Promise<string> => {
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  // @ts-ignore - Type mismatch due to nested @smithy dependencies
  return await getSignedUrl(s3Instance, getCommand, {
    expiresIn: TIME.ONE_HOUR,
  });
};

/** Uploads image variants to S3 and generates presigned URLs for secure access to private buckets. */
export const uploadImages = async (
  s3Instance: S3Client,
  image: ImageVariants,
  options: {
    destination: string;
    format: keyof FormatEnum;
    bucketName: string;
    region: string;
  }
) => {
  const { fileName } = image;
  const { format, bucketName, /* region,*/ destination } = options;
  const { name: baseName } = path.parse(fileName);

  let payload = Object.entries(image.variations);

  return Promise.all(
    payload.map(async ([variant, { buffer, size }]) => {
      const config = {
        fileName: `${variant}_${baseName}.${format ?? DEFAULT_FILE_TYPE}`,
      };

      const key = destination
        ? `${destination}/${baseName}/${config.fileName}`
        : `${baseName}/${config.fileName}`;

      const command = new PutObjectCommand({
        Body: buffer,
        Bucket: bucketName,
        Key: key,
        ContentType: "image/webp",
      });

      const s3Response = await s3Instance.send(command);

      // Generate presigned URL for secure access to private buckets
      const imageURL = await generatePresignedUrl(s3Instance, bucketName, key);

      return {
        variant,
        fileName: image.fileName,
        imageURL,
        size,
        ETag: s3Response.ETag,
      };
    })
  );
};
