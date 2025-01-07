export const isImageFile = (fileName: string | null): boolean => {
  if (!fileName) return false

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
}
