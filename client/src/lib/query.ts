import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { BucketsResponse, TreeNode } from "@shared/types";

import { fetchPresignedUrl, setBatcherBucket } from "@/lib/presigned-url-batcher";
import { postUploadImages } from "@/services/images";
import { getBuckets, getFileTree } from "@/services/s3";

export const useBuckets = () =>
	useQuery<BucketsResponse, Error>({
		queryKey: ["buckets"],
		queryFn: getBuckets,
	});

export const useFileTree = (bucketName: string, bucketRegion: string) => {
	const query = useQuery<TreeNode[]>({
		queryKey: ["fileTree", bucketName],
		queryFn: () => getFileTree(bucketName, bucketRegion),
	});

	// NOTE: This is temporary until we add lazy/progressive loading for the file tree
	// based on expansion state
	const childMap = useMemo(() => {
		const map = new Map<string, TreeNode[]>();
		query.data?.forEach((node) => {
			const siblings = map.get(node.parentId) || [];
			siblings.push(node);
			map.set(node.parentId, siblings);
		});

		return map;
	}, [query.data]);

	return { ...query, childMap };
};

export const useMutateUpload = (bucketName: string) => {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (formData: FormData) => postUploadImages(formData),
		onSuccess: () => {
			qc.invalidateQueries({
				exact: false,
				queryKey: ["fileTree", bucketName],
			});
		},
	});
};

const FIFTY_MINUTES_MS = 50 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Fetches presigned URLs for a list of S3 object keys.
 * Under the hood, calls from multiple components in the same render cycle
 * are batched into a single network request via the presigned URL batcher.
 */
export const usePresignedUrls = (keys: string[], bucketName: string, bucketRegion: string) => {
	setBatcherBucket(bucketName, bucketRegion); // Keep the batcher in sync with the active bucket

	const sortedKeys = [...keys].sort();

	return useQuery<Record<string, string>>({
		queryKey: ["presignedUrls", bucketName, ...sortedKeys],
		queryFn: async () => {
			const entries = await Promise.all(sortedKeys.map(async (key) => [key, await fetchPresignedUrl(key)] as const));
			return Object.fromEntries(entries);
		},
		enabled: sortedKeys.length > 0,
		staleTime: FIFTY_MINUTES_MS,
		gcTime: FIVE_MINUTES_MS,
	});
};
