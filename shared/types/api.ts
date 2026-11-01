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
  /** Name of the bucket; empty when S3 returned none. */
  Name: string;
  /** When the bucket was created, as an ISO 8601 string; empty when S3 returned none. */
  CreationDate: string;
  /** `CreationDate` for display, e.g. `"1st March, 2025"`. */
  formattedCreationDate: string;
  /** AWS region the bucket lives in; bucket requests must be sent there. */
  BucketRegion: string;
  /** Number of objects counted in the bucket. */
  objectCount: number;
  /** Sum of the counted objects' sizes in bytes. */
  totalSizeBytes: number;
  /** `totalSizeBytes` for display, e.g. `"1.5 MB"`. */
  totalSizeHuman: string;
  /** `false` when the bucket was never counted, so `objectCount` and the sizes are placeholders, not figures. */
  counted: boolean;
  /** `true` when the count stopped early or never ran, so `objectCount` and the sizes are lower bounds. */
  partial: boolean;
};

export type BucketsResponse = {
  /** The buckets on the requested page, each with its stats. */
  buckets: Bucket[];
  /** Sum of `objectCount` over this page's buckets. */
  totalObjectCount: number;
  /** Sum of `totalSizeBytes` over this page's buckets. */
  totalSizeBytes: number;
  /** `totalSizeBytes` for display, e.g. `"1.5 MB"`. */
  totalSizeHuman: string;
  /** `true` when any bucket on this page is `partial`, so the totals are lower bounds. */
  partial: boolean;
  /** The page returned, from 1. */
  page: number;
  /** Most buckets a page holds. */
  limit: number;
  /** Number of buckets in the account. */
  totalCount: number;
  /** Number of pages at this `limit`. */
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
  /** Bucket key the variant was stored under. */
  key: string;
  /** Presigned URL of the stored variant; it expires. */
  imageURL: `https://${string}`;
  /** Human-readable size of the stored variant, e.g. `"1.5 MB"`. */
  size: string;
  /** Size of the stored variant in bytes. */
  bytes: number;
  /** Pixel width of the stored variant as displayed, measured from the output. */
  width: number;
  /** Pixel height of the stored variant as displayed, measured from the output. */
  height: number;
  /** S3 ETag of the stored object, exactly as S3 returned it (quotes included). */
  ETag: string;
};

export type FileVariants = FileVariant[];

export type UploadSuccess = {
  message: string;
  files: FileVariant[];
};
