import { DEFAULT_FILE_TYPE } from '@/lib/constants/image'
import { type ImageVariants } from './types'

import { PutObjectCommand, type PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { type FormatEnum } from 'sharp'
import * as path from 'path'

export const uploadImages = async (
  s3Instance: S3Client,
  image: ImageVariants,
  options: {
    format: keyof FormatEnum
    bucketName: string
    region: string
  }
) => {
  const { fileName } = image
  const { format, bucketName, region } = options
  const { name: baseName } = path.parse(fileName)

  let payload = Object.entries(image.variations)

  payload.push([
    'source',
    {
      buffer: image.source.buffer as Buffer,
      size: image.source.size
    }
  ])

  return Promise.all(
    payload.map(async ([variant, { buffer, size }]) => {
      const config = {
        fileName: variant === 'source' ? fileName : `${variant}_${baseName}.${format ?? DEFAULT_FILE_TYPE}`
      }

      const key = `${baseName}/${config.fileName}`

      const command = new PutObjectCommand({
        Body: buffer,
        Bucket: bucketName,
        Key: key,
        ACL: 'public-read',
        ContentType: variant === 'source' ? 'image/x-raw' : 'image/webp'
      })

      const s3Response = await s3Instance.send(command)

      return {
        variant,
        fileName: image.fileName,
        imageURL: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
        size,
        ETag: s3Response.ETag
      }
    })
  )
}
