import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { readableSize } from '@/lib/helpers'
import { ImageVariants } from '../image/service'

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

export const buildTree = ({ objects }: { objects: S3Object[] }): TreeNode[] => {
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

const uploadVariants = async (s3Instance: S3Client, image: ImageVariants, bucketName: string) => {
  const { fileName } = image
  const parsedPath = path.parse(fileName)
  const baseName = parsedPath.name
  const ext = parsedPath.ext

  console.log('upload!')

  const uploadPromises = await Object.entries(image.variations).map(async ([variation, { buffer }]) => {
    const key = `${baseName}/${variation}_${baseName}${ext}`

    console.log({
      // buffer,
      bucketName,
      key,
      ACL: 'public-read',
      ContentType: 'image/webp'
    })

    const command = new PutObjectCommand({
      Body: buffer,
      Bucket: bucketName,
      Key: key,
      ACL: 'public-read',
      ContentType: 'image/webp'
    })

    return s3Instance.send(command)
  })

  console.log('uploadVariants', uploadPromises)
  return Promise.all(uploadPromises)
}

export const s3 = {
  uploadImage: uploadVariants
}
