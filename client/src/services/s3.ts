"use server";

import ofetch from "@/lib/ofetch";
import type { BucketsResponse, TreeNode } from "@/types/api";

export const getBuckets = async () => {
  // try {
  const data = await ofetch<BucketsResponse>("/s3/buckets");
  return data;
  // } catch (e) {
  //   console.error("getBuckets exception", e);
  //   return {};
  // }
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
