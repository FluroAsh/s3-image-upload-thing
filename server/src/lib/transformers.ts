import { type Bucket } from '@aws-sdk/client-s3'
import { format } from 'date-fns'

export const transformBucket = (bucket: Bucket) => {
  const formattedCreationDate = bucket.CreationDate ? format(bucket.CreationDate, 'do LLLL, yyyy') : ''

  return {
    Name: bucket.Name,
    CreationDate: bucket.CreationDate,
    formattedCreationDate,
    BucketRegion: bucket.BucketRegion
  }
}
