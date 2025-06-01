'use client'

import { useState } from 'react'
import { LucideFile, LucideFolderClosed, LucideFolderOpen, LucideImage } from 'lucide-react'
import { cn } from '@/lib/utils'

import { type TreeNode } from '@/services/s3'
import { isImageFile } from '@/lib/helpers'
import { DEPTH_PADDING_MAP } from './constants'
import { getImageVariants, replaceFileSegment } from './utils'

import { ExplorerProvider, useExplorer } from '../../lib/providers/explorer-provider'
import { Navigation } from './navigation'
import { ExplorerViewPanel } from './explorer.view-panel'
import { ExplorerActivePanel } from './explorer.active-panel'

const Explorer = ({ bucketName, children }: { bucketName: string | undefined; children: React.ReactNode }) => {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

  return (
    <div>
      <h3>{bucketName}</h3>
      <ExplorerProvider bucketName={bucketName ?? ''}>
        <Navigation />
        <div
          id="explorer-container"
          className="grid grid-cols-[800px_1fr] grid-rows-subgrid min-h-[736px] overflow-hidden"
        >
          {children}
        </div>
      </ExplorerProvider>
    </div>
  )
}

/**
 * Renders a file tree structure from a given array of TreeNode objects.
 *
 * This function recursively maps through the provided nodes to generate a nested unordered list (<ul><li>) representing the file tree.
 * It handles both folders and image variants, rendering them with the appropriate components.
 *
 * @example
 * // Example usage:
 * const fileTree = [
 *   { name: 'folder1', isFolder: true, children: [...] },
 *   { name: 'image1.jpg', isFolder: false },
 *   { name: 'image2_large.jpg', isFolder: false },
 *   { name: 'image2_small.jpg', isFolder: false },
 * ];
 *
 * <Explorer nodes={fileTree} bucketName="my-bucket" />
 */
export const renderFileTree = (nodes: TreeNode[], bucketName: string, prevPath = '') => (
  <ul>
    {nodes.map((node, idx) => {
      const currentPath = prevPath ? `${prevPath}/${node.name}` : node.name

      const { isImageVariant, variants } = getImageVariants(node.isFolder, node)
      const props = { node, bucketName, currentPath }

      return <li key={idx}>{isImageVariant ? <ImageVariant variants={variants} {...props} /> : <Node {...props} />}</li>
    })}
  </ul>
)

type ImageVariantProps = {
  node: TreeNode
  variants: TreeNode[]
  currentPath: string
}

const ImageVariant = ({ variants, node, currentPath }: ImageVariantProps) => {
  const {
    actions: { setActiveFile },
    state: { bucketName, activeFile }
  } = useExplorer()

  const largeFilename = variants.find((v) => v.name.includes('large'))?.name || ''
  const relativeLargePath = replaceFileSegment(currentPath, `${node.name}/${largeFilename}`)

  return (
    <div
      className={cn(
        'text-sm hover:cursor-pointer select-none transition-colors duration-75',
        activeFile.fileName === node.name ? 'bg-sky-500' : 'hover:bg-sky-600',
        DEPTH_PADDING_MAP[node.depth]
      )}
      onClick={() => {
        setActiveFile({
          remoteURL: `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${relativeLargePath}`,
          fileName: node.name,
          variants
        })
      }}
    >
      <LucideImage className="inline mr-2" />
      <span className="text-sm">{node.name}</span>
    </div>
  )
}

const File = ({ node, remoteURL }: { node: TreeNode; remoteURL: string }) => {
  const {
    actions: { setActiveFile },
    state: { activeFile }
  } = useExplorer()

  return (
    <p
      className={cn(
        'text-sm hover:cursor-pointer select-none transition-colors duration-75',
        activeFile.fileName === node.name ? 'bg-sky-500' : 'hover:bg-sky-600',
        DEPTH_PADDING_MAP[node.depth]
      )}
      onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
    >
      {isImageFile(node.name) ? <LucideImage className="inline mr-2" /> : <LucideFile className="inline mr-2" />}
      <span className="text-sm">{node.name}</span>
    </p>
  )
}

const Node = ({ node, bucketName, currentPath }: { node: TreeNode; bucketName: string; currentPath: string }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  return node.isFolder ? (
    <div>
      <div
        className={cn(
          'flex text-sm hover:cursor-pointer select-none transition-colors duration-75 hover:bg-sky-600',
          DEPTH_PADDING_MAP[node.depth]
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? <LucideFolderOpen className="inline mr-2" /> : <LucideFolderClosed className="inline mr-2" />}
        <span className="text-sm">{node.name}</span>
      </div>

      {/* Recursively render subtree descendants */}
      <div className={isExpanded ? 'block' : 'hidden'}>
        {node.children && node.children.length > 0 && renderFileTree(node.children, bucketName, currentPath)}
      </div>
    </div>
  ) : (
    <File
      node={node}
      remoteURL={`https://${bucketName}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${currentPath}`}
    />
  )
}

const ViewPanel = ExplorerViewPanel
const ActivePanel = ExplorerActivePanel

export { Explorer, ViewPanel, ActivePanel }
