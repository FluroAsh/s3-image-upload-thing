import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as path from "path";
import { type FormatEnum } from "sharp";

import type { FileVariant } from "@shared/types";

import { TIME } from "@/shared/constants";
import type { ImageVariants } from "@/shared/types/image";
import type { BucketStats } from "@/shared/types/s3";

import { DEFAULT_FILE_TYPE } from "../processors/variants/config";

// ---------------------------------------------------------------------------
// S3 client
// - A singleton is created due to the single-tenant nature of the application
// - Region only needs to be specified once during initialization, as S3 is a globally
//   available service, it's only used to optimise S3 operations, such as presigning URLs.
// ---------------------------------------------------------------------------

export const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  // Use this option so we only need a single S3 instance for all regions
  // Rather than having to create nwe S3 isntances, for EACH region on the AWS account
  followRegionRedirects: true,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

// ---------------------------------------------------------------------------
// Bucket stats
// ---------------------------------------------------------------------------

export const getBucketStats = async (
  bucketName: string,
): Promise<BucketStats> => {
  const stats: BucketStats = { objectCount: 0, totalSize: 0 };
  let continuationToken: string | undefined;

  try {
    do {
      const res = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        }),
      );

      if (res.Contents) {
        for (const obj of res.Contents) {
          stats.objectCount += 1;
          stats.totalSize += obj.Size ?? 0;
        }
      }

      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);
  } catch {
    return stats;
  }
  return stats;
};

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export const generatePresignedUrl = async (
  bucketName: string,
  key: string,
): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  // @ts-expect-error - nested @smithy type mismatch between S3Client and presigner
  return getSignedUrl(s3Client, command, {
    expiresIn: TIME.ONE_HOUR_IN_SECONDS,
  });
};

export const uploadImages = async (
  image: ImageVariants,
  options: {
    destination: string;
    format: keyof FormatEnum;
    bucketName: string;
  },
): Promise<FileVariant[]> => {
  const { fileName } = image;
  const { format, bucketName, destination } = options;
  const baseName = path.parse(fileName).name;
  const formatExt = format ?? DEFAULT_FILE_TYPE;

  return Promise.all(
    Object.entries(image.variations).map(
      async ([variant, { buffer, size }]) => {
        const fileNameKey = `${variant}_${baseName}.${formatExt}`;
        const key = destination
          ? `${destination}/${baseName}/${fileNameKey}`
          : `${baseName}/${fileNameKey}`;

        const putResponse = await s3Client.send(
          new PutObjectCommand({
            Body: buffer,
            Bucket: bucketName,
            Key: key,
            ContentType: "image/webp",
          }),
        );

        const imageURL = await generatePresignedUrl(bucketName, key);

        return {
          variant,
          fileName: image.fileName,
          imageURL,
          size,
          ETag: putResponse.ETag,
        } as FileVariant;
      },
    ),
  );
};
