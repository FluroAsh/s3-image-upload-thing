import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
