import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readableSize } from "@/lib/helpers";

export type BucketStats = {
  objectCount: number;
  totalSize: number;
};

/**
 * Fetches object count and total size (bytes) for a bucket using ListObjectsV2
 * with pagination. Returns { objectCount: 0, totalSize: 0 } on permission or
 * not-found errors so callers get a consistent response shape.
 */
export const getBucketStats = async (
  s3Client: S3Client,
  bucketName: string
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

export const createInstance = (region: string) =>
  new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

export type S3Object = {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string; // eg: "STANDARD"
  Owner: {
    DisplayName: string;
    ID: string;
  };
};

type TreeNode = {
  name: string;
  isFolder: boolean;
  depth: number;
  children: TreeNode[];
  size?: string;
  presignedUrl?: string; // Presigned URL for file access (only for files, not folders)
};

/** Natural sort comparison that handles numbers within strings properly */
const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, {
    numeric: true, // Checks numbers in a sequence of characters and handles it correctly (ie: 1 < 10)
    sensitivity: "base",
  });

const sortTreeNodes = (nodes: TreeNode[]): TreeNode[] =>
  nodes
    .sort((a, b) => {
      // Folders come before files
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      // Within same type, sort naturally (handles numbers)
      return naturalSort(a.name, b.name);
    })
    .map((node) => ({
      ...node,
      children: sortTreeNodes(node.children),
    }));

/**
 *
 * Generates presigned URLs for all file nodes in the tree
 * Recursively processes the tree and adds presigned URLs to files (not folders) -- 1 hour expiration
 */
const addPresignedUrls = async (
  nodes: TreeNode[],
  s3Client: S3Client,
  bucketName: string,
  pathPrefix: string = ""
): Promise<TreeNode[]> =>
  Promise.all(
    nodes.map(async (node) => {
      const fullPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;

      if (node.isFolder) {
        // 🔁 Recursively process children inside folders
        return {
          ...node,
          children: await addPresignedUrls(
            node.children,
            s3Client,
            bucketName,
            fullPath
          ),
        };
      } else {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fullPath,
          });

          // @ts-ignore - Type mismatch due to nested @smithy dependencies
          const presignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600, // 1 hour expiration
          });

          return { ...node, presignedUrl };
        } catch (error) {
          console.error(
            `Failed to generate presigned URL for ${fullPath}:`,
            error
          );
          return node;
        }
      }
    })
  );

export const buildFileTree = async ({
  objects,
  s3Client,
  bucketName,
}: {
  objects: S3Object[];
  s3Client: S3Client;
  bucketName: string;
}): Promise<TreeNode[]> => {
  const root: TreeNode[] = [];

  // Pre-sort objects by path length to reduce lookups
  const sortedObjects = objects.sort((a, b) => a.Key.length - b.Key.length);

  sortedObjects.forEach((obj) => {
    const parts = obj.Key.split("/").filter(Boolean);
    let currentLevel = root;

    parts.forEach((part, index) => {
      // Locate the node which we want to append to or modify if it exists in our current level.
      const existingNode = currentLevel.find((node) => node.name === part);

      if (existingNode) {
        // Update existing node
        if (index < parts.length - 1) {
          existingNode.isFolder = true;
          existingNode.size = undefined;
        }
        currentLevel = existingNode.children;
      } else {
        // Create new node
        const newNode: TreeNode = {
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

  const sortedTree = sortTreeNodes(root);

  // Add presigned URLs to all file nodes
  return addPresignedUrls(sortedTree, s3Client, bucketName);
};
