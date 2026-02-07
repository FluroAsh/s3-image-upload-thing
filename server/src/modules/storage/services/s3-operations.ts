import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as path from "path";
import { type FormatEnum } from "sharp";

import { TIME } from "@/shared/constants";
import { DEFAULT_FILE_TYPE } from "@/shared/constants/image";
import type { ImageVariants } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";

import { UploadResult } from "./upload-pipeline";

// ---------------------------------------------------------------------------
// Client & types
// ---------------------------------------------------------------------------

export const createInstance = (region: string) =>
  new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

export type BucketStats = {
  objectCount: number;
  totalSize: number;
};

export type S3Object = {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
  Owner: { DisplayName: string; ID: string };
};

export type FileTreeNode = {
  name: string;
  isFolder: boolean;
  depth: number;
  children: FileTreeNode[];
  size?: string;
  presignedUrl?: string;
};

// ---------------------------------------------------------------------------
// Bucket stats
// ---------------------------------------------------------------------------

export const getBucketStats = async (
  s3Client: S3Client,
  bucketName: string,
): Promise<BucketStats> => {
  const stats: BucketStats = { objectCount: 0, totalSize: 0 };
  let continuationToken: string | undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });
      const res = await s3Client.send(command);
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
// File tree (for get-bucket)
// ---------------------------------------------------------------------------

const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const sortTreeNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
  nodes
    .sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return naturalSort(a.name, b.name);
    })
    .map((node) => ({ ...node, children: sortTreeNodes(node.children) }));

const addPresignedUrls = async (
  nodes: FileTreeNode[],
  s3Client: S3Client,
  bucketName: string,
  pathPrefix: string = "",
): Promise<FileTreeNode[]> =>
  Promise.all(
    nodes.map(async (node) => {
      const fullPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
      if (node.isFolder) {
        return {
          ...node,
          children: await addPresignedUrls(
            node.children,
            s3Client,
            bucketName,
            fullPath,
          ),
        };
      }
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: fullPath,
        });
        // @ts-expect-error - nested @smithy type mismatch
        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: TIME.ONE_HOUR,
        });
        return { ...node, presignedUrl };
      } catch (err) {
        console.error(`Failed to generate presigned URL for ${fullPath}:`, err);
        return node;
      }
    }),
  );

export const buildFileTree = async ({
  objects,
  s3Client,
  bucketName,
}: {
  objects: S3Object[];
  s3Client: S3Client;
  bucketName: string;
}): Promise<FileTreeNode[]> => {
  const root: FileTreeNode[] = [];
  const sortedObjects = objects.sort((a, b) => a.Key.length - b.Key.length);

  sortedObjects.forEach((obj) => {
    const parts = obj.Key.split("/").filter(Boolean);
    let currentLevel = root;
    parts.forEach((part, index) => {
      const existing = currentLevel.find((n) => n.name === part);
      if (existing) {
        if (index < parts.length - 1) existing.isFolder = true;
        currentLevel = existing.children;
      } else {
        const newNode: FileTreeNode = {
          name: part,
          isFolder: index < parts.length - 1,
          depth: index,
          children: [],
          size: index === parts.length - 1 ? readableSize(obj.Size) : undefined,
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    });
  });

  return addPresignedUrls(sortTreeNodes(root), s3Client, bucketName);
};

// ---------------------------------------------------------------------------
// Upload image variants to S3
// ---------------------------------------------------------------------------

const generatePresignedUrl = async (
  s3Instance: S3Client,
  bucketName: string,
  key: string,
): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  // @ts-expect-error - nested @smithy type mismatch
  return getSignedUrl(s3Instance, command, { expiresIn: TIME.ONE_HOUR });
};

export const uploadImages = async (
  s3Instance: S3Client,
  image: ImageVariants,
  options: {
    destination: string;
    format: keyof FormatEnum;
    bucketName: string;
    region: string;
  },
): Promise<UploadResult[]> => {
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

        const putResponse = await s3Instance.send(
          new PutObjectCommand({
            Body: buffer,
            Bucket: bucketName,
            Key: key,
            ContentType: "image/webp",
          }),
        );

        const imageURL = await generatePresignedUrl(
          s3Instance,
          bucketName,
          key,
        );

        return {
          variant,
          fileName: image.fileName,
          imageURL,
          size,
          ETag: putResponse.ETag,
        };
      },
    ),
  );
};
