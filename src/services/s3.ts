'use server'

import axios from '@/lib/axios'

export type Bucket = {
  Name: string
  CreationDate: string
  formattedCreationDate: string
  BucketRegion: string
}

export type TreeNode = {
  name: string
  isFolder: boolean
  depth: number
  children: TreeNode[]
  size?: string
}

export const getBuckets = async () => {
  try {
    const res = await axios.get<{ buckets: Bucket[] }>('/s3/buckets')
    const { buckets } = res.data ?? {}

    return buckets || [1, 2, 3]
  } catch (e) {
    console.error(e)
    return []
  }
}

export const getFileTree = async (bucketName: string) => {
  try {
    const { data: { tree } = {} } = await axios.get<{ tree: TreeNode[] }>(`/s3/bucket/${bucketName}`)

    return tree
  } catch (e) {
    console.log('Caught exception', e)
    return []
  }
}
