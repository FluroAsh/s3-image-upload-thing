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

export type Bucket = {
  Name: string;
  CreationDate: string;
  formattedCreationDate: string;
  BucketRegion: string;
  objectCount: number;
};

export type TreeNode = {
  name: string;
  isFolder: boolean;
  depth: number;
  children: TreeNode[];
  size?: string;
  presignedUrl?: string;
};
