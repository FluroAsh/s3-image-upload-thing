import { useActiveBucket } from '@/hooks/useActiveBucket'
import { useFileTree } from '@/lib/query'

import { TreeNode } from '@/services/s3'
import { LucideArrowLeft, LucideFolder, LucideSearch } from 'lucide-react'
import { MutableRefObject, useEffect, useState } from 'react'
import { Folder } from './folder'

const findCurrentFolders = (
  activeNode: TreeNode | undefined,
  rootNodes: TreeNode[] | undefined,
  searchQuery: string
) => {
  const folders = activeNode
    ? activeNode.children.filter((node) => node.isFolder)
    : rootNodes?.filter((node) => node.isFolder) || []

  return searchQuery ? folders.filter((node) => node.name.toLowerCase().includes(searchQuery.toLowerCase())) : folders
}

export const FolderSelect = ({ folderPathRef }: { folderPathRef: MutableRefObject<string> }) => {
  const { bucketName } = useActiveBucket()
  const { data: nodes } = useFileTree(bucketName)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [folderStack, setFolderStack] = useState<TreeNode[]>([])

  const activeFolder = folderStack[folderStack.length - 1] || undefined
  const currentPath = folderStack.map((node) => node.name).join('/')

  const currentFolders = findCurrentFolders(activeFolder, nodes, searchQuery)

  const handleFolderSelect = (node: TreeNode) => {
    setFolderStack((prev) => {
      const newStack = [...prev, node]
      folderPathRef.current = newStack.map((n) => n.name).join('/')
      return newStack
    })
  }

  const handleBack = () => setFolderStack((prev) => prev.slice(0, -1))

  return (
    // Header
    <div className="mb-4">
      <div className="mb-4">
        <div className="text-neutral-300">
          <span className="font-mono bg-neutral-800 px-2 py-1 rounded text-xs text-white">
            {currentPath ? currentPath : bucketName}
          </span>
        </div>
      </div>

      {/* Search/Navigaton */}
      <div className="flex gap-x-2 mb-4">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-[32px] w-full p-2 rounded-md border border-neutral-500 text-neutral-600 focus:outline-none focus:border-neutral-300"
            placeholder="Search folders..."
          />
          <LucideSearch className="absolute top-1/2 left-2 size-4 text-neutral-500 transform -translate-y-1/2" />
        </div>

        <button
          className="flex gap-x-2 items-center bg-neutral-500 text-neutral-100 px-4 py-2 rounded-md"
          onClick={handleBack}
        >
          <LucideArrowLeft className="size-4 mr-2" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {currentFolders.length > 0 ? (
        <>
          <div className="grid grid-cols-5 gap-4 overflow-x-hidden h-[300px] p-4 rounded-md border border-neutral-500">
            {currentFolders.map((folder, i) => (
              <Folder key={`${folder.name}-${i}`} name={folder.name} onClick={() => handleFolderSelect(folder)} />
            ))}
          </div>
        </>
      ) : (
        <div className="mb-4">
          <div className="p-4 rounded-md border border-neutral-500 h-[300px] grid place-items-center">
            <div>
              <LucideFolder className="size-12 mx-auto mb-4 stroke-neutral-500" />
              {activeFolder ? (
                <span className="text-neutral-300">No folders found in {activeFolder.name}</span>
              ) : (
                <span className="text-neutral-300">No folders found in {bucketName}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
