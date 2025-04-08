import { Bucket, getBuckets, getFileTree, TreeNode } from '@/services/s3'
import { useQuery } from '@tanstack/react-query'

export const useBuckets = () =>
  useQuery<Bucket[]>({
    queryKey: ['buckets'],
    queryFn: getBuckets
  })

export const useFileTree = (bucketName: string) =>
  useQuery<TreeNode[]>({
    queryKey: ['fileTree', bucketName],
    queryFn: async () => (await getFileTree(bucketName)) ?? []
  })
