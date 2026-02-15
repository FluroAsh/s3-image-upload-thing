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

if (!process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
  throw new Error(
    "Jingle jingle, you're missing keys! Please ensure ACCESS_KEY_ID and SECRET_ACCESS_KEY are set in the environment variables.",
  );
}

// ---------------------------------------------------------------------------
// S3 client
// - A singleton is created due to the single-tenant nature of the application
// - Region only needs to be specified once during initialization, as S3 is a globally
//   available service, it's only used to optimise S3 operations, such as presigning URLs.
// ---------------------------------------------------------------------------

const createS3Client = (region: string = "us-east-1") =>
  new S3Client({
    region,
    followRegionRedirects: true,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

export const s3Client = createS3Client(process.env.AWS_REGION ?? "us-east-1");

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

const presignClientCache = new Map<string, S3Client>();

export const generatePresignedUrl = async (
  bucketName: string,
  bucketRegion: string,
  key: string,
): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });

  let regionalClient = presignClientCache.get(bucketRegion) ?? s3Client;

  if (!regionalClient) {
    regionalClient = createS3Client(bucketRegion);
    presignClientCache.set(bucketRegion, regionalClient);
  }

  // @ts-expect-error - nested @smithy type mismatch between S3Client and presigner
  return getSignedUrl(regionalClient, command, {
    expiresIn: TIME.ONE_HOUR_IN_SECONDS,
  });
};

export const uploadImages = async (
  image: ImageVariants,
  options: {
    destination: string;
    format: keyof FormatEnum;
    bucketName: string;
    bucketRegion: string;
  },
): Promise<FileVariant[]> => {
  const { fileName } = image;
  const { format, bucketRegion, bucketName, destination } = options;
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

        const imageURL = await generatePresignedUrl(
          bucketName,
          bucketRegion,
          key,
        );

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
