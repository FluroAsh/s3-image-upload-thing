import { type TreeNode } from '@/services/s3'

const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1]

export const getImageCollection = (isFolder: boolean, node: TreeNode) => {
  const variants: TreeNode[] = []
  let isImageCollection = false

  if (!isFolder && (!node.children || node.children.length === 0)) {
    return { isImageCollection, variants }
  }

  for (const child of node.children) {
    if (child.children.length === 0 && extractFilename(child.name) === node.name) {
      variants.push(child)
    }
  }

  isImageCollection =
    node.children.length === variants.length &&
    variants.every((variant) => extractFilename(variant.name) === node.name && variant.children.length === 0)

  return { isImageCollection, variants }
}

export const replaceFileSegment = (filename: string, value: string) => filename.replace(/[^/]+$/, value)
