import { WithS3Client } from '@/middleware/with-s3-client'
import { Context } from 'hono'
import { createImageVariants, prepareImages } from './model'
import { uploadImages } from './service'

export const uploadImagesHandler = async (ctx: Context<WithS3Client>) => {
  const { s3Instance, region } = ctx.var
  const { bucketName, ...formData } = await ctx.req.parseBody()
  const fileEntries = Object.entries(formData)

  if (fileEntries.length === 0) {
    return ctx.json({ error: 'No files uploaded' }, 404)
  }

  try {
    const images = await prepareImages(fileEntries)

    if (images.length === 0) {
      return ctx.json({ error: 'Unable to prepare images' }, 500)
    }

    const processedImages = await Promise.all(
      images.map(async (sourceImage) => {
        if (sourceImage) {
          const { fieldName, fileName, fileType: filetype, size } = sourceImage

          const variations = await createImageVariants(sourceImage)
          sourceImage.buffer = await Buffer.from(sourceImage.buffer as ArrayBuffer)

          return { fieldName, fileName, filetype, size, source: sourceImage, variations }
        }
      })
    )

    if (processedImages.length === 0) {
      return ctx.json({ error: 'Unable to process images' }, 401)
    }

    const uploadResults = await Promise.all(
      processedImages.map(async (image) => {
        if (image) {
          return await uploadImages(s3Instance, image, {
            format: 'webp',
            bucketName: bucketName as string,
            region
          })
        }
      })
    )

    return ctx.json({
      message: 'Successful upload.',
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
}
