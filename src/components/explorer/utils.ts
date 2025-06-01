import { type TreeNode } from '@/services/s3'

const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1]

// Takes a folder node and returns a single "image variant" node
// When clicked it should set the "active" view which will display the "large" variant
// and include the other variants as URLs below as additional links...
export const getImageVariants = (isFolder: boolean, node: TreeNode) => {
  const parentChildrenCount = node.children.length

  const variants: TreeNode[] = []
  let isImageVariant = false

  if (isFolder && node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childBaseName = extractFilename(child.name)
      console.log('child', { childBaseName, parentName: node.name }, child)

      if (child.children.length === 0 && childBaseName === node.name) {
        variants.push(child)
      }
    }
  }

  const triggerParentUpdate =
    parentChildrenCount === getImageVariants.length &&
    variants.every((variant) => {
      const variantBaseName = extractFilename(variant.name)

      return variantBaseName === node.name && variant.children.length === 0
    })

  if (triggerParentUpdate) {
    // Cleanup the parent child nodes, removing variants to prevent rendering of child nodes...
    for (let i = 0; i <= variants.length; i++) {
      node.children.splice(i, 1)
    }
  }

  isImageVariant = variants.length > 0 && variants.every((variant) => variant.children.length === 0)
  console.log(node, { variants, isImageVariant })

  return { isImageVariant, variants }
}

export const replaceFileSegment = (filename: string, value: string) => filename.replace(/[^/]+$/, value)
