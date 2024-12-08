import { Hono } from 'hono'
import { ListBucketsCommand, S3ServiceException } from '@aws-sdk/client-s3'

import withS3Client, { type WithS3Client } from '@/middleware/with-s3-client'
import { transformBucket } from '@/utils/transformers'

const s3 = new Hono<WithS3Client>()
s3.use('*', withS3Client)

s3.get('/buckets', async (c) => {
  const limit = Number(c.req.query('limit')) || 10
  const { s3Instance, region } = c.var

  try {
    const listCommand = new ListBucketsCommand({
      BucketRegion: region,
      MaxBuckets: limit
    })

    const res = await s3Instance.send(listCommand)

    if (!res.Buckets) {
      return c.json({ error: 'No buckets found' }, 404)
    }

    return c.json({ buckets: res.Buckets.map(transformBucket) })
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(`Error from S3 while listing buckets.  ${e.name}: ${e.message}`)
    } else {
      throw e
    }
  }
})

s3.post('/buckets/:bucketName', async (c) => {
  // TODO: Upload object(s) to a bucket (upload image(s))
  // Upload into a bucket subdirectory if specified
})

s3.get('/buckets/:bucketName', async (c) => {
  // TODO: Get a buckets contents
})

s3.put('/buckets/:bucketName', async (c) => {
  // TODO: Update a buckets properties (e.g., name, region, etc.)
})

s3.delete('/buckets/:bucketName', async (c) => {
  // TODO: Delete a bucket
})

s3.delete('/buckets/:bucketName/object/:name', async (c) => {
  // TODO: Delete an object from a bucket
})

s3.put('/buckets/:bucketName/object/:name', async (c) => {
  // TODO: Update an object in a bucket
})

export default s3
