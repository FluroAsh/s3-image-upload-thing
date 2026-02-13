import type { BucketsResponse, TreeNode } from "@shared/types";

import ofetch from "@/lib/ofetch";

export const getBuckets = async (): Promise<BucketsResponse> => {
  const data = await ofetch<BucketsResponse>("/storage/buckets");
  return data;
};

export const getFileTree = async (bucketName: string): Promise<TreeNode[]> => {
  const { tree = [] } = await ofetch<{ tree: TreeNode[] }>(
    `/storage/buckets/${bucketName}`,
  );
  return tree;
};
