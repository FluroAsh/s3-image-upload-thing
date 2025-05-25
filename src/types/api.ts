export type Variant = 'thumbnail' | 'medium' | 'large'

export type FileVariant = {
  variant: Variant
  fileName: string
  imageURL: `https://${string}`
  size: string
  ETag: string
}

export type FileVariants = FileVariant[]

export type UploadSuccess = { message: string; files: FileVariants[] }
