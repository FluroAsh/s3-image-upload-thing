import { postUploadImages } from '@/services/images'
import { Bucket, getBuckets, getFileTree, TreeNode } from '@/services/s3'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export const useBuckets = () =>
  useQuery<Bucket[]>({
    queryKey: ['buckets'],
    queryFn: getBuckets
  })

export const useFileTree = (bucketName: string) =>
  useQuery<TreeNode[]>({
    queryKey: ['fileTree', bucketName],
    queryFn: () => getFileTree(bucketName)
  })

export const useMutateUpload = (bucketName: string) => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => postUploadImages(formData),
    onSuccess: () => {
      qc.invalidateQueries({
        exact: false,
        queryKey: ['fileTree', bucketName]
      })
    }
  })
}
