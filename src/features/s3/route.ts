import { Hono } from 'hono'
import { ListBucketsCommand, ListObjectsCommand, S3ServiceException } from '@aws-sdk/client-s3'

import withS3Client, { type WithS3Client } from '@/middleware/with-s3-client'
import { transformBucket } from '@/lib/transformers'
import { buildFileTree, type S3Object } from '@/features/s3/service'

const s3 = new Hono<WithS3Client>()
s3.use('*', withS3Client)

s3.get('/buckets', async (ctx) => {
  const { s3Instance, region } = ctx.var
  const limit = Number(ctx.req.query('limit')) || 10

  try {
    // TODO: Add pagination - refer to: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/ListBucketsCommand/
    const listCommand = new ListBucketsCommand({
      BucketRegion: region,
      MaxBuckets: limit
    })

    const res = await s3Instance.send(listCommand)

    if (!res.Buckets) {
      return ctx.json({ error: 'No buckets found' }, 404)
    }

    return ctx.json({ buckets: res.Buckets.map(transformBucket) })
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(`Error from S3 while listing buckets.  ${e.name}: ${e.message}`)
    } else {
      throw e
    }
  }
})

// -------------------------------------//
// ---- Single "Bucket" Operations ---- //
// -------------------------------------//

/** Returns a tree of objects that are stored in the bucket */
s3.get('/bucket/:bucketName', async (ctx) => {
  const { s3Instance, region } = ctx.var
  const bucketName = ctx.req.param('bucketName')
  try {
    const listCommand = new ListObjectsCommand({
      Bucket: bucketName
    })

    const res = await s3Instance.send(listCommand)

    if (!res.Contents) {
      return ctx.json({ message: 'No objects found' }, 200)
    }

    const fileTree = buildFileTree({ objects: res.Contents as S3Object[] })

    return ctx.json({ tree: fileTree })
  } catch (e) {
    console.error(e)
  }
})

s3.post('/bucket/:bucketName', async (c) => {
  // TODO: Upload object(s) to a bucket (upload image(s))
  // Upload into a bucket subdirectory if specified
})

s3.put('/bucket/:bucketName', async (c) => {
  // TODO: Update a bucket properties (e.g., name, region, etc.)
  // 1. Get the bucket and return a tree
})

s3.delete('/bucket/:bucketName', async (c) => {
  // TODO: Delete a bucket
})

// -------------------------------------//
// ---- Single "Object" Operations ---- //
// -------------------------------------//
s3.get('/bucket/:bucketName/object/:name', async (ctx) => {
  // TODO: Get "type" of object (e.g., image, text, etc.)
  const { s3Instance, region } = ctx.var
  const bucketName = ctx.req.param('bucketName')
  const objectKey = ctx.req.param('name')

  console.log(`Getting object: ${objectKey} from bucket: ${bucketName}`)

  // fetch the presigned URL via the AWS SDK
  // const url = await getImage(bucketName, objectKey)
  // return c.json({ url })

  return ctx.json({ url: 'https://via.placeholder.com/150' })
})

s3.delete('/bucket/:bucketName/object/:name', async (c) => {
  // TODO: Delete an object from a bucket
})

s3.put('/bucket/:bucketName/object/:name', async (c) => {
  // TODO: Update an object in a bucket
})

export default s3
