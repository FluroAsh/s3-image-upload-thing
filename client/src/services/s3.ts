import ofetch from "@/lib/ofetch";
import { BUCKETS_LIST_MAX } from "~/shared/constants/buckets";
import type { BucketLocation, BucketsResponse, FileTreeResponse, PinnedBucketResponse } from "~/shared/types";

/** The server answers a stalled listing with a 500 after its own deadline, so a retry would only multiply the wait. */
export const NO_RETRY = { retry: 0 } as const;

/** The query string every bucket-scoped route reads its bucket and region from. */
export const bucketQuery = ({ bucketName, bucketRegion }: BucketLocation) => ({
	bucket: bucketName,
	region: bucketRegion,
});

export const getBuckets = async (): Promise<BucketsResponse> => {
	const data = await ofetch<BucketsResponse>("/storage/buckets", { ...NO_RETRY, query: { limit: BUCKETS_LIST_MAX } });
	return data;
};

export const getFileTree = (bucketName: string, bucketRegion: string): Promise<FileTreeResponse> =>
	ofetch<FileTreeResponse>(`/storage/buckets/${bucketName}`, {
		...NO_RETRY,
		query: bucketQuery({ bucketName, bucketRegion }),
	});

export const putPinnedBucket = (bucket: string | null): Promise<PinnedBucketResponse> =>
	ofetch<PinnedBucketResponse>("/settings/pinned-bucket", { method: "PUT", body: { bucket } });
