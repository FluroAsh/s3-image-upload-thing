'use client'

import { useState } from 'react'
import { LucideFile, LucideFolderClosed, LucideFolderOpen, LucideImage, LucideImages } from 'lucide-react'
import { cn } from '@/lib/utils'

import { type TreeNode } from '@/services/s3'
import { isImageFile } from '@/lib/helpers'
import { DEPTH_PADDING_MAP } from './constants'
import { getImageCollection, replaceFileSegment } from './utils'

import { ExplorerProvider, useExplorer } from '../../lib/providers/explorer-provider'
import { Navigation } from './navigation'
import { ExplorerViewPanel } from './explorer.view-panel'
import { ExplorerActivePanel } from './explorer.active-panel'
import { type ImageVariant } from '@/types/images'

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
 * Image variants will *not* recursively render their children, as they are intended to display a collection of image variants (e.g., thumbnail, medium, large).
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

      const { isImageCollection, variants } = getImageCollection(node.isFolder, node)
      const props = { node, bucketName, currentPath }

      return (
        <li key={idx}>
          {isImageCollection ? <ImageCollection size="large" variants={variants} {...props} /> : <Node {...props} />}
        </li>
      )
    })}
  </ul>
)

type ImageVariantProps = {
  node: TreeNode
  variants: TreeNode[]
  currentPath: string
  /** Used for setting the desired size for the image preview in the Explorer's "active" panel — by default this is "large". */
  size?: ImageVariant
}

/**
 * This component will not recursively render children, it is intended to be used immediately, and display a
 * collection of image variants for a given node (thumbnail, medium, large, etc.).
 */
const ImageCollection = ({ variants, node, currentPath, size = 'large' }: ImageVariantProps) => {
  const {
    actions: { setActiveFile },
    state: { bucketName, activeFile }
  } = useExplorer()

  const resizedFilename = variants.find((v) => v.name.includes(size))?.name || ''
  const resizedRelativePath = replaceFileSegment(currentPath, `${node.name}/${resizedFilename}`)

  return (
    <div
      className={cn(
        'text-sm hover:cursor-pointer select-none transition-colors duration-75',
        activeFile.fileName === node.name ? 'bg-sky-500' : 'hover:bg-sky-600',
        DEPTH_PADDING_MAP[node.depth]
      )}
      onClick={() => {
        setActiveFile({
          remoteURL: `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${resizedRelativePath}`,
          fileName: node.name,
          variants
        })
      }}
    >
      <LucideImages className="inline mr-2" />
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

/** Render a single node in the file tree, and recursively render its children if it is a folder. */
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
