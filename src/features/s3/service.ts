import { S3Client } from '@aws-sdk/client-s3'
import { readableSize } from '@/lib/helpers'

import * as path from 'path'

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
    const parts = obj.Key.split('/')
    let currentLevel = root

    parts.forEach((part, index) => {
      const existingNode = currentLevel.find((node) => node.name === part)

      if (existingNode) {
        currentLevel = existingNode.children
      } else {
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

  return root
}
