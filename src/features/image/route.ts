import withS3Client, { type WithS3Client } from '@/middleware/with-s3-client'
import { Hono } from 'hono'
import { createImageVariants, ImageVariants, processImage as prepareImages } from './service'
import { s3 } from '../s3/service'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const image = new Hono<WithS3Client>()
image.use('*', withS3Client)

image.post('/upload', async (ctx) => {
  const { s3Instance } = ctx.var
  const formData = await ctx.req.parseBody()
  const bucketName = formData.bucketName as string
  const fileEntries = Object.entries(formData)

  if (fileEntries.length === 0) {
    return ctx.json({ error: 'No files uploaded' }, 404)
  }

  try {
    const images = await prepareImages(fileEntries)

    if (images.length === 0) {
      return ctx.json({ error: 'Unable to prepare images' }, 500)
    }

    // TODO: Move this logic
    const processedImages = await Promise.all(
      images.map(async (image) => {
        if (image) {
          const { fieldName, fileName, fileType: filetype, size } = image

          const variations = await createImageVariants(image)
          return { fieldName, fileName, filetype, size, source: image, variations }
        }
      })
    )

    if (processedImages.length === 0) {
      return ctx.json({ error: 'Unable to process images' }, 401)
    }

    // TODO: Move this logic
    const uploadResults = await Promise.all(
      processedImages.map(async (image) => {
        if (image) {
          // Return array or promises containing each variation for the image
          const uploadResponses = await s3.uploadImage(s3Instance, image, bucketName)
          return uploadResponses
        }
      })
    )

    return ctx.json({
      message: 'Files successfully processed and uploaded.',
      files: uploadResults
    })
  } catch (error) {
    console.error('Error in upload process:', error)
    return ctx.json(
      {
        error: 'An unexpected error occurred during upload',
        message: error
      },
      500
    )
  }
})

export default image
