import { S3Client } from '@aws-sdk/client-s3'
import { readableSize } from '@/lib/helpers'

export const createInstance = (region: string) =>
  new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!
    }
  })

export type S3Object = {
  Key: string
  LastModified: Date
  ETag: string
  Size: number
  StorageClass: string // eg: "STANDARD"
  Owner: {
    DisplayName: string
    ID: string
  }
}

type TreeNode = {
  name: string
  isFolder: boolean
  depth: number
  children: TreeNode[]
  size?: string
}

/** Natural sort comparison that handles numbers within strings properly */
const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, {
    numeric: true, // Checks numbers in a sequence of characters and handles it correctly (ie: 1 < 10)
    sensitivity: 'base'
  })

const sortTreeNodes = (nodes: TreeNode[]): TreeNode[] =>
  nodes
    .sort((a, b) => {
      // Folders come before files
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1
      }
      // Within same type, sort naturally (handles numbers)
      return naturalSort(a.name, b.name)
    })
    .map((node) => ({
      ...node,
      children: sortTreeNodes(node.children)
    }))

export const buildFileTree = ({ objects }: { objects: S3Object[] }): TreeNode[] => {
  const root: TreeNode[] = []

  // Pre-sort objects by path length to reduce lookups
  const sortedObjects = objects.sort((a, b) => a.Key.length - b.Key.length)

  sortedObjects.forEach((obj) => {
    const parts = obj.Key.split('/').filter(Boolean)
    let currentLevel = root

    parts.forEach((part, index) => {
      // Locate the node which we want to append to or modify if it exists in our current level.
      const existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        // Update existing node
        if (index < parts.length - 1) {
          existingNode.isFolder = true
          existingNode.size = undefined
        }
        currentLevel = existingNode.children
      } else {
        // Create new node
        const newNode: TreeNode = {
          name: part,
          isFolder: index < parts.length - 1,
          depth: index,
          children: [],
          size: index === parts.length - 1 ? readableSize(obj.Size) : undefined
        }
        currentLevel.push(newNode)
        currentLevel = newNode.children
      }
    })
  })

  return sortTreeNodes(root)
}
