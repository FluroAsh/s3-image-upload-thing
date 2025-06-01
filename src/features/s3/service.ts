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

// TODO: Convert this into a flat list of objects with a parent-child relationship (e.g: w/ parentId property)
export const buildFileTree = ({ objects }: { objects: S3Object[] }): TreeNode[] => {
  const root: TreeNode[] = []

  objects.forEach((obj) => {
    let currentLevel = root

    // Filter out empty parts to handle trailing/double slashes
    // eg: ["japan-2025", "/"] — as S3 will return a trailing slash for "folder" Objects
    const parts = obj.Key.split('/').filter((part) => part.trim() !== '')

    parts.forEach((part, idx) => {
      const existingNode = currentLevel.find((node) => node.name === part)
      const isLastPart = idx === parts.length - 1

      if (existingNode) {
        currentLevel = existingNode.children

        if (!isLastPart) {
          // If we're revisiting a node and it's not the last part, it must be a folder
          existingNode.isFolder = true
          existingNode.size = undefined // Remove size from folders
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          isFolder: !isLastPart, // Initially assume it's a folder if not the last part
          depth: idx,
          children: [],
          size: isLastPart ? readableSize(obj.Size) : undefined
        }
        currentLevel.push(newNode)
        currentLevel = newNode.children
      }
    })
  })

  return root
}
