import ofetch from "@/lib/ofetch";
import type { BucketsResponse, TreeNode } from "~/shared/types";

/** The server answers a stalled listing with a 500 after its own deadline, so a retry would only multiply the wait. */
const NO_RETRY = { retry: 0 } as const;

export const getBuckets = async (): Promise<BucketsResponse> => {
	const data = await ofetch<BucketsResponse>("/storage/buckets", NO_RETRY);
	return data;
};

export const getFileTree = async (bucketName: string, bucketRegion: string): Promise<TreeNode[]> => {
	const { tree = [] } = await ofetch<{ tree: TreeNode[] }>(
		`/storage/buckets/${bucketName}?region=${bucketRegion}`,
		NO_RETRY,
	);
	return tree;
};
