"use server";

import ofetch from "@/lib/ofetch";

export type Bucket = {
  Name: string;
  CreationDate: string;
  formattedCreationDate: string;
  BucketRegion: string;
};

export type TreeNode = {
  name: string;
  isFolder: boolean;
  depth: number;
  children: TreeNode[];
  size?: string;
  presignedUrl?: string;
};

export const getBuckets = async () => {
  try {
    const { buckets } = await ofetch<{ buckets: Bucket[] }>("/s3/buckets");
    return buckets || [1, 2, 3]; // TODO: Clean this up
  } catch (e) {
    console.error("getBuckets exception", e);
    return [];
  }
};

export const getFileTree = async (bucketName: string) => {
  try {
    const { tree = [] } = await ofetch<{ tree: TreeNode[] }>(
      `/s3/bucket/${bucketName}`
    );
    return tree;
  } catch (e) {
    console.error("getFileTree exception", e);
    return [];
  }
};
