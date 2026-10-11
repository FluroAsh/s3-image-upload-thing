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
  /** Which entry of the variant table this stored file is. */
  variant: ImageVariant;
  /** Name of the uploaded file the variant was made from, with its extension. */
  fileName: string;
  /** Presigned URL of the stored variant; it expires. */
  imageURL: `https://${string}`;
  /** Human-readable size of the stored variant, e.g. `"1.5 MB"`. */
  size: string;
  /** Pixel width of the stored variant as displayed, measured, not configured. */
  width: number;
  /** Pixel height of the stored variant as displayed, measured. */
  height: number;
  /** S3 ETag of the stored object, `undefined` when S3 returned none. */
  ETag: string | undefined;
};

export type FileVariants = FileVariant[];

export type UploadSuccess = {
  message: string;
  files: FileVariant[];
};
