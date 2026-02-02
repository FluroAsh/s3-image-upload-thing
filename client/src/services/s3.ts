"use server";

import ofetch from "@/lib/ofetch";
import type { BucketsResponse, TreeNode } from "@/types/api";

export const getBuckets = async (): Promise<BucketsResponse> => {
  const data = await ofetch<BucketsResponse>("/s3/buckets");
  return data;
};

export const getFileTree = async (bucketName: string): Promise<TreeNode[]> => {
  const { tree = [] } = await ofetch<{ tree: TreeNode[] }>(
    `/s3/bucket/${bucketName}`
  );
  return tree;
};
