import { /*CAMERA_DIMENSIONS,*/ IMAGE_VARIANTS, IMAGE_WIDTH, PHOTO_FORMATS } from '@/lib/constants/image'
import { readableSize } from '@/lib/helpers'
import { getFileType } from '@/lib/utils'
import type { OutputOptions } from './types/sharp'
import type { ImageVariant, ProcessedImage } from './types'
import { processNefWithDarktable } from '@/infrastructure/image/darktable'

import sharp, { type FormatEnum } from 'sharp'
// import exifr from 'exifr'

export const prepareImages = (files: [string, string | File][]) =>
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

const createVariant = async (width: number, size: ImageVariant, source: ProcessedImage, isPhotoFormat: boolean) => {
  const outputFormat: keyof FormatEnum = 'webp'
  let outputOptions: OutputOptions = { quality: 85 }
  let rawBuffer = null

  if (isPhotoFormat) {
    const inputBuffer = Buffer.isBuffer(source.buffer) ? source.buffer : Buffer.from(source.buffer)
    // const exifData = await exifr.parse(new Uint8Array(source.buffer))
    // console.log('exifr', exifData)

    // rawBuffer = await processNefWithDcraw(source.buffer as Buffer)
    rawBuffer = await processNefWithDarktable(inputBuffer, { format: 'jpeg' })

    // const { width: cameraWidth } = CAMERA_DIMENSIONS[exifData.model] ?? CAMERA_DIMENSIONS['NIKON Z 50']
    // width = IMAGE_WIDTH.xLarge

    outputOptions = {
      ...outputOptions,
      quality: size === 'thumbnail' ? 80 : 100,
      nearLossless: true // Perceptually lossless compression
    } as any
  }

  const instance = sharp(rawBuffer ?? source.buffer)

  const variant = instance.clone().rotate().resize({ width, withoutEnlargement: true })

  const buffer = await variant.toFormat(outputFormat, outputOptions).toBuffer()
  const compressedSize = readableSize(buffer.length)

  console.log(`||== ✅ "${source.fileName}" | ${size} | successfully compressed image to ${compressedSize} ==||`)
  return { buffer, size: compressedSize }
}

export const checkPhotoFormat = (image: ProcessedImage) => {
  const fileType = getFileType(image.fileName).replace('.', '')
  return PHOTO_FORMATS.includes(fileType)
}

export const createImageVariants = async (sourceImage: ProcessedImage) => {
  const isPhotoFormat = checkPhotoFormat(sourceImage)

  const [thumbnail, medium, large] = await Promise.all(
    IMAGE_VARIANTS.map((v) => createVariant(IMAGE_WIDTH[v], v, sourceImage, isPhotoFormat))
  )

  return { thumbnail, medium, large }
}
