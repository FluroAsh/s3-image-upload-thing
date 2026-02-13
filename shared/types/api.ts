import type { ImageVariant } from "./image";

export type TreeNode = {
  /** Full S3 key path, e.g. `"japan-2025/kyoto/kyoto-1.webp"` */
  id: string;
  /** Parent folder path, empty string for root-level nodes */
  parentId: string;
  /** Display name, e.g. `"kyoto-1.webp"` */
  name: string;
  /** Depth in the tree (root = 0) */
  depth: number;
  isFolder: boolean;
  /** Number of direct children (folders or files) */
  childCount: number;
  /** Human-readable size, e.g. `"1.5 MB"` */
  size?: string;
  presignedUrl?: string;
};

export type Bucket = {
  Name: string;
  CreationDate: string;
  formattedCreationDate: string;
  BucketRegion: string;
  objectCount: number;
  totalSizeBytes: number;
  totalSizeHuman: string;
};

export type BucketsResponse = {
  buckets: Bucket[];
  totalObjectCount: number;
  totalSizeBytes: number;
  totalSizeHuman: string;
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type PresignedUrlEntry = {
  key: string;
  url: string;
};

export type PresignedUrlError = {
  key: string;
  error: string;
};

export type PresignedUrlsResponse = {
  urls: PresignedUrlEntry[];
  errors?: PresignedUrlError[];
};

export type FileVariant = {
  variant: ImageVariant;
  fileName: string;
  imageURL: `https://${string}`;
  size: string;
  ETag: string | undefined;
};

export type FileVariants = FileVariant[];

export type UploadSuccess = {
  message: string;
  files: FileVariant[];
};
