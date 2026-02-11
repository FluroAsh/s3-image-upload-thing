import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPresignedUrl,
  setBatcherBucket,
} from "@/lib/presigned-url-batcher";
import { postUploadImages } from "@/services/images";
import { getBuckets, getFileTree } from "@/services/s3";
import type { BucketsResponse, TreeNode } from "@/types/api";

export const useBuckets = () =>
  useQuery<BucketsResponse, Error>({
    queryKey: ["buckets"],
    queryFn: getBuckets,
  });

export const useFileTree = (bucketName: string) =>
  useQuery<TreeNode[]>({
    queryKey: ["fileTree", bucketName],
    queryFn: () => getFileTree(bucketName),
  });

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

/**
 * Fetches presigned URLs for a list of S3 object keys.
 * Under the hood, calls from multiple components in the same render cycle
 * are batched into a single network request via the presigned URL batcher.
 */
export const usePresignedUrls = (keys: string[], bucketName: string) => {
  setBatcherBucket(bucketName); // Keep the batcher in sync with the active bucket

  const sortedKeys = [...keys].sort();

  return useQuery<Record<string, string>>({
    queryKey: ["presignedUrls", bucketName, ...sortedKeys],
    queryFn: async () => {
      const entries = await Promise.all(
        sortedKeys.map(
          async (key) => [key, await fetchPresignedUrl(key)] as const,
        ),
      );
      return Object.fromEntries(entries);
    },
    enabled: sortedKeys.length > 0,
    staleTime: FIFTY_MINUTES_MS,
  });
};
