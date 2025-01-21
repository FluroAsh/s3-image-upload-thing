import fileSize from 'file-size'

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
          size: index === parts.length - 1 ? fileSize(obj.Size).human('si') : undefined
        }
        currentLevel.push(newNode)
        currentLevel = newNode.children
      }
    })
  })

  return root
}
