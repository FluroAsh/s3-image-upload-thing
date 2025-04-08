import { createInstance } from '../lib/s3-client'
import { createMiddleware } from 'hono/factory'
import { S3Client } from '@aws-sdk/client-s3'

export type WithS3Client = {
  Variables: {
    s3Instance: S3Client
    region: string
  }
}

const withS3Client = createMiddleware<WithS3Client>(async (ctx, next) => {
  const region = ctx.req.header('x-amz-bucket-region')

  if (!region) {
    return ctx.json({ error: 'Missing region header' }, 400)
  }

  const s3Instance = createInstance(region)
  ctx.set('s3Instance', s3Instance)
  ctx.set('region', region)
  await next()
})

export default withS3Client
