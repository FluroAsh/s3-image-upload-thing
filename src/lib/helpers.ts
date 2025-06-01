import { LucideImage, LucideImages, LucideListVideo, LucideVideo } from 'lucide-react'

export const isImageFile = (fileName: string | null) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

  return fileName ? imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext)) : false
}

export const isVideoFile = (fileName: string | null) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v']

  return fileName ? videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext)) : false
}

export const getFileIcon = (fileName: string | null, multiple?: boolean) => {
  switch (true) {
    case isVideoFile(fileName):
      return multiple ? LucideListVideo : LucideVideo
    case isImageFile(fileName):
      return multiple ? LucideImages : LucideImage
    default:
      return undefined
  }
}
