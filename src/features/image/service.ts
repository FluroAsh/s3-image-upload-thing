import { DEFAULT_FILE_TYPE } from '@/constants'
import type { ImageVariants } from './model'
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
    payload.map(async ([variant, { buffer }]) => {
      const key = `${baseName}/${variant === 'source' ? '' : `${variant}_`}${baseName}.${format ?? DEFAULT_FILE_TYPE}`

      const command = new PutObjectCommand({
        Body: buffer,
        Bucket: bucketName,
        Key: key,
        ACL: 'public-read',
        ContentType: 'image/webp'
      })

      const s3Response = await s3Instance.send(command)

      return {
        fileName: image.fileName,
        variant,
        ETag: s3Response.ETag,
        imageURL: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
        attempts: s3Response.$metadata.attempts
      }
    })
  )
}
