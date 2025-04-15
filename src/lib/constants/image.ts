import { ImageVariant } from '@/features/image/types'

export const DEFAULT_FILE_TYPE = 'webp'

export const IMAGE_VARIANTS = ['thumbnail', 'medium', 'large'] as ImageVariant[]

export const IMAGE_WIDTH = {
  thumbnail: 120,
  medium: 800,
  large: 1440,
  xLarge: 2048
} as const

export const PHOTO_FORMATS = ['NEF']

export const CAMERA_DIMENSIONS = {
  ['NIKON Z 50']: { width: 5568, height: 3712 }
  // Other cameras... 🥸
} as { [key: string]: { width: number; height: number } }
