import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as path from "path";
import { type FormatEnum } from "sharp";

import { TIME } from "@/shared/constants";
import type { ImageVariants } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";

import { DEFAULT_FILE_TYPE } from "../processors/variants/config";
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

// export type S3Object = {
//   Key: string;
//   LastModified: Date;
//   ETag: string;
//   Size: number;
//   StorageClass: string;
//   Owner: { DisplayName: string; ID: string };
// };

// export type FileTreeNode = {
//   name: string;
//   isFolder: boolean;
//   depth: number;
//   children: FileTreeNode[];
//   size?: string;
//   presignedUrl?: string;
// };

type FileTreeNode = {
  /** example: `"japan-2025/kyoto/kyoto-1.webp"` */
  id: string;
  parentId: string | null; // null for root level node
  name: string; // object-key (eg: `"kyoto-1.webp"`)
  depth: number; // depth of the node in the tree (root = 0, ie: count number of slashes)
  isFolder: boolean; // if the object is a folder, not a file (has a trailing slash, eg: "japan-2025/kyoto/")
  childCount: number; // number of child nodes (folders or files)
  /** Size of the object in bytes */
  size?: string; //
  /** Presigned URL for the object */
  presignedUrl?: string; // TODO: Remove this, and refactor with an on-demand endpoint which uses the object path/id
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

/** Sorts strings alphanumerically, ignoring case and special characters. */
const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

// TODO:
// - [ ] Sort nodes, folders and root level files (no children) to appear at the top of the list
// - [ ] Children nodes to appear at the bottom of the list...
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
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: fullPath,
        });

        // @ts-expect-error - nested @smithy type mismatch
        const presignedUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn: TIME.ONE_HOUR,
        });
        return { ...node, presignedUrl };
      } catch (err) {
        console.error(`Failed to generate presigned URL for ${fullPath}:`, err);
        return node;
      }
    }),
  );

// const sortObjects = (objects: _Object[]) =>
//   objects.sort((a, b) => a.Key.length - b.Key.length);

export const constructFileTree = async ({
  objects,
  s3Client,
  bucketName,
}: {
  objects: _Object[];
  s3Client: S3Client;
  bucketName: string;
}): Promise<FileTreeNode[]> => {
  // All Objects should have a key
  const filteredObjects = objects.filter(
    (obj): obj is _Object & { Key: string } => !!obj.Key,
  );

  if (!filteredObjects.length) {
    return [];
  }

  // Single pass: build parent→children map AND collect all implied folder paths
  // Uses folder path WITH trailing slash as key for consistency (e.g. "japan-2025/kyoto/")
  const childrenMap = new Map<string, string[]>();
  const impliedFolders = new Set<string>();
  const existingKeys = new Set(filteredObjects.map((obj) => obj.Key));

  // Build childrenMap and impliedFolders
  filteredObjects.forEach((obj) => {
    const parts = obj.Key.split("/").filter(Boolean);
    const parentParts = parts.slice(0, -1);
    const parentId = parentParts.length ? parentParts.join("/") + "/" : "";

    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }

    childrenMap.get(parentId)!.push(obj.Key);

    // Collect all ancestor folder paths that don't exist as real objects
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join("/") + "/";
      if (!existingKeys.has(folderPath)) {
        impliedFolders.add(folderPath);
      }
    }
  });

  // Register implied folders as children in the childrenMap
  impliedFolders.forEach((folderPath) => {
    const parts = folderPath.split("/").filter(Boolean);
    const parentParts = parts.slice(0, -1);
    const parentId = parentParts.length ? parentParts.join("/") + "/" : "";

    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(folderPath);
  });

  // Create nodes for implied folders (folders that don't exist as actual S3 objects)
  const folderNodes: FileTreeNode[] = Array.from(impliedFolders).map(
    (folderPath) => {
      const parts = folderPath.split("/").filter(Boolean);
      const parentParts = parts.slice(0, -1);
      const parentId = parentParts.length ? parentParts.join("/") + "/" : "";

      return {
        id: folderPath,
        parentId,
        name: parts[parts.length - 1],
        depth: parts.length - 1,
        isFolder: true,
        childCount: childrenMap.get(folderPath)?.length ?? 0,
        size: undefined,
        presignedUrl: undefined,
      };
    },
  );

  // Create nodes for actual S3 objects (files and explicit folder markers)
  const objectNodes: FileTreeNode[] = filteredObjects.map((obj) => {
    const parts = obj.Key.split("/").filter(Boolean);
    const isFolder = obj.Key.endsWith("/");
    const parentParts = parts.slice(0, -1);
    const parentId = parentParts.length ? parentParts.join("/") + "/" : "";

    return {
      id: obj.Key,
      parentId,
      name: parts[parts.length - 1],
      depth: parts.length - 1,
      isFolder,
      childCount: isFolder ? (childrenMap.get(obj.Key)?.length ?? 0) : 0,
      size: obj.Size ? readableSize(obj.Size) : undefined,
      presignedUrl: undefined,
    };
  });

  // Combine and sort: folders first at each depth, then alphabetically
  const allNodes = [...folderNodes, ...objectNodes].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth; // 1. Sort by depth (parents before children)
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1; // 2. Folders before files at the same depth
    return naturalSort(a.name, b.name); // 3. Alphabetical by name
  });

  return allNodes;
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
