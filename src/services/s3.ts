'use server'

import axios from '@/lib/axios'

type Bucket = {
  Name: string
  CreationDate: string
  formattedCreationDate: string
  BucketRegion: string
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
