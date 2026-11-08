import type { Collection, CollectionPhoto, CollectionsFile } from "./collections";
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

export type FileTreeResponse = {
  /** Every folder and file listed in the bucket, flattened, parents before children. */
  tree: TreeNode[];
  /** `true` when the listing passed its time limit before S3 sent every key, so `tree` holds only the first part of the bucket. */
  partial: boolean;
  /** Path the CDN serves this bucket under, `""` for the CDN root; a set's CDN path is this plus its folder. */
  cdnPrefix: string;
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

export type CreateCollectionRequest = {
  name: string;
  /** CDN paths of the sets to start with; a collection exists only while it has photos. */
  sets: string[];
};

export type CreateCollectionResponse = {
  collection: Collection;
  /** Sets taken out of another collection, each with the slug it left. */
  moved: { set: string; from: string }[];
};

export type SetMembersRequest = {
  /** CDN paths of the sets, each listed once; added to `collection` in this order. */
  sets: string[];
  /** Slug of an existing collection to add or move the sets to; `null` takes them out of their collection. */
  collection: string | null;
};

export type SetMembersResponse = {
  /** The whole document after the change. */
  file: CollectionsFile;
  /** Sets taken out of a collection, whether moved to another or cleared, each with the slug it left; a collection left empty is removed. */
  moved: { set: string; from: string }[];
};

export type UpdateCollectionRequest = {
  /** The slug stays, so links to the collection keep working. */
  name?: string;
  /** A set in the collection; `null` goes back to the first photo. */
  cover?: string | null;
};

export type UpdateCollectionResponse = {
  collection: Collection;
};

export type DeleteCollectionResponse = {
  /** The whole document after the change. */
  file: CollectionsFile;
};

export type ReorderCollectionRequest = {
  /** Exactly the collection's current sets, in the new display order. */
  sets: string[];
};

export type ReorderCollectionResponse = UpdateCollectionResponse;

export type UpdatePhotoRequest = Partial<Pick<CollectionPhoto, "alt" | "caption" | "tags">>;

export type UpdatePhotoResponse = {
  photo: CollectionPhoto;
};
