import type { _Object } from "@aws-sdk/client-s3";

/** S3 object with a guaranteed Key (filtering out SDK's optional typing). */
export type ValidObject = _Object & { Key: string };

export type BucketStats = {
  objectCount: number;
  totalSize: number;
};

export type FileTreeNode = {
  /** Full S3 key path, e.g. `"japan-2025/kyoto/kyoto-1.webp"` */
  id: string;
  /** Parent folder path, empty string for root-level nodes */
  parentId: string;
  /** Display name, e.g. `"kyoto-1.webp"` */
  name: string;
  /** Depth in the tree (root = 0) */
  depth: number;
  /** Whether this node represents a folder */
  isFolder: boolean;
  /** Number of direct children (folders or files) */
  childCount: number;
  /** Human-readable size, e.g. `"1.5 MB"` */
  size?: string;
  /** Presigned URL for the object */
  presignedUrl?: string;
};
