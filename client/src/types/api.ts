export type Variant = "placeholder" | "small" | "medium" | "large" | "lossless";

export type FileVariant = {
  variant: Variant;
  fileName: string;
  imageURL: `https://${string}`;
  size: string;
  ETag: string;
};

export type FileVariants = FileVariant[];

export type UploadSuccess = { message: string; files: FileVariant[] };

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

export type Bucket = {
  Name: string;
  CreationDate: string;
  formattedCreationDate: string;
  BucketRegion: string;
  objectCount: number;
  totalSizeBytes: number;
  totalSizeHuman: string;
};

export type TreeNode = {
  id: string;
  parentId: string;
  name: string;
  depth: number;
  isFolder: boolean;
  childCount: number;
  size: string;
  presignedUrl: string;
};

export type PresignedUrlEntry = {
  key: string;
  url: string;
};

export type PresignedUrlsResponse = {
  urls: PresignedUrlEntry[];
  errors?: { key: string; error: string }[];
};
