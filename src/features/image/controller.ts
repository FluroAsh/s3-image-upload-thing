import { WithS3Client } from '@/middleware/with-s3-client'
import { Context } from 'hono'
import { createImageVariants, prepareImages } from './model'
import { uploadImages } from './service'
// import { readableSize, writeToDesktop } from '@/lib/helpers'
// import { processNefWithDarktable } from '@/infrastructure/image/darktable'
// import sharp from 'sharp'

export const uploadImagesHandler = async (ctx: Context<WithS3Client>) => {
  const { s3Instance, region } = ctx.var
  const { bucketName, images, destination } = await ctx.req.parseBody({ all: true })

  const fileEntries = Object.entries(Array.isArray(images) ? images : [images])

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
          const { fieldName, fileName, fileType, size } = sourceImage

          // TODO: generate AVIF formats and save to bucket as an additional format (for HDR content)
          const variations = await createImageVariants(sourceImage)

          // TODO: Update source buffer with a compressed version
          // of the original RAW ".NEF" image
          // const sourceBuffer = await processNefWithDarktable(
          //   Buffer.isBuffer(sourceImage.buffer) ? sourceImage.buffer : Buffer.from(sourceImage.buffer)
          // )

          // const instance = await sharp(sourceBuffer)
          //   .toFormat('webp', {
          //     // lossless: true
          //     quality: 100,
          //     nearLossless: true,
          //     smartSubsample: true,
          //     effort: 6
          //   })
          //   .toColorspace('srgb')
          //   .toBuffer()

          // sourceImage.buffer = instance
          // sourceImage.size = readableSize(instance.length)

          // TODO: Optionally generate a "HDR" variation if "withHDR" is true
          return { fieldName, fileName, fileType, size, source: sourceImage, variations }
        }
      })
    )

    if (processedImages.length === 0) {
      return ctx.json({ error: 'Unable to process images' }, 401)
    }

    const uploadResults = await Promise.all(
      processedImages.map(async (image) => {
        if (image) {
          // return await writeToDesktop(image)
          return await uploadImages(s3Instance, image, {
            destination: destination as string,
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
