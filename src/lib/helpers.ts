export const isImageFile = (fileName: string | null): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

  return fileName ? imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext)) : false
}
