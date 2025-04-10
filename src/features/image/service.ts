import { readableSize } from '@/lib/helpers'
import sharp, { type FormatEnum } from 'sharp'

export type ProcessedImage = {
  fieldName: string
  buffer: ArrayBuffer
  fileName: string
  fileType: string
  size: string
}

type ImageVariant = 'thumbnail' | 'medium' | 'large'

export type ImageVariants = {
  fieldName: string
  fileName: string
  filetype: string
  size: string
  source: ProcessedImage
  variations: Record<
    ImageVariant,
    {
      buffer: Buffer
      size: string
    }
  >
}

export const processImage = (files: [string, string | File][]) =>
  Promise.all(
    files.map(async ([fieldName, file]): Promise<ProcessedImage | undefined> => {
      if (file instanceof File) {
        return {
          fieldName,
          buffer: await file.arrayBuffer(),
          fileName: file.name,
          fileType: file.type,
          size: readableSize(file.size)
        }
      }
    })
  )

const createVariant = async (width: number, size: ImageVariant, image: ProcessedImage) => {
  const options: {
    format: keyof FormatEnum
    quality: number
  } = {
    format: 'webp',
    quality: 90
  }

  const instance = sharp(image.buffer)

  const variant = instance.clone().resize({
    width
    // ...other options
  })

  const buffer = await variant.toFormat(options.format, { quality: options.quality }).toBuffer()
  console.log(`| "${image.fileName}" | ${size} successfully processed. |`)

  return { buffer, size: readableSize(buffer.length) }
}

export const createImageVariants = async (image: ProcessedImage) => {
  const [thumbnail, medium, large] = await Promise.all([
    createVariant(120, 'thumbnail', image),
    createVariant(800, 'medium', image),
    createVariant(1440, 'large', image)
  ])

  return { thumbnail, medium, large }
}
