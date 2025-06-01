'use client'

import { useState } from 'react'
import {
  LucideChevronUp,
  LucideFile,
  LucideFolderClosed,
  LucideFolderOpen,
  LucideImage,
  LucideImages
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { type TreeNode } from '@/services/s3'
import { type ImageVariant } from '@/types/images'
import { DEPTH_PADDING_MAP } from './constants'
import { isImageFile } from '@/lib/helpers'
import { getImageCollection, replaceFileSegment } from './utils'

import { ExplorerProvider, useExplorer } from '../../lib/providers/explorer-provider'
import { Navigation } from './navigation'
import { ExplorerViewPanel } from './explorer.view-panel'
import { ExplorerActivePanel } from './explorer.active-panel'

const Explorer = ({ bucketName, children }: { bucketName: string | undefined; children: React.ReactNode }) => {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

  return (
    <div>
      <ExplorerProvider bucketName={bucketName ?? ''}>
        <Navigation />
        <div id="explorer-container" className="flex h-[736px] overflow-hidden">
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
        'flex items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5',
        activeFile.fileName === node.name
          ? 'bg-sky-800/30 text-neutral-100 border border-sky-800/30'
          : 'text-neutral-100 hover:bg-slate-700 hover:text-neutral-100',
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
      <LucideImages className="size-4 mr-2 text-sky-400 flex-shrink-0" />
      <span className="text-sm truncate">{node.name}</span>
      <div className="ml-auto">
        <span className="text-xs bg-slate-700 text-sky-400 px-2 py-0.5 rounded-full">{variants.length}</span>
      </div>
    </div>
  )
}

const File = ({ node, remoteURL }: { node: TreeNode; remoteURL: string }) => {
  const {
    actions: { setActiveFile },
    state: { activeFile }
  } = useExplorer()

  return (
    <div
      className={cn(
        'flex items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5',
        activeFile.fileName === node.name
          ? 'bg-sky-600 text-neutral-100 border border-sky-500'
          : 'text-neutral-100 hover:bg-slate-700 hover:text-neutral-100',
        DEPTH_PADDING_MAP[node.depth]
      )}
      onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
    >
      {isImageFile(node.name) ? (
        <LucideImage className="size-4 mr-2 text-sky-400 flex-shrink-0" />
      ) : (
        <LucideFile className="size-4 mr-2 text-slate-400 flex-shrink-0" />
      )}
      <span className="text-sm truncate">{node.name}</span>
      {node.size && <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{node.size}</span>}
    </div>
  )
}

/** Render a single node in the file tree, and recursively render its children if it is a folder. */
const Node = ({ node, bucketName, currentPath }: { node: TreeNode; bucketName: string; currentPath: string }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const FolderIcon = isExpanded ? LucideFolderOpen : LucideFolderClosed

  return node.isFolder ? (
    <>
      <div
        className={cn(
          'flex items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5',
          'text-neutral-100 hover:bg-slate-700 hover:text-neutral-100',
          DEPTH_PADDING_MAP[node.depth]
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="inline-flex mr-2">
          <LucideChevronUp
            className={`size-4 mr-2 transition duration-75', ${
              isExpanded ? 'stroke-slate-400 rotate-180' : 'rotate-0 stroke-sky-400'
            }`}
          />
          <FolderIcon className="size-4 mr-2 stroke-sky-400" />
        </div>
        <span className="text-sm font-medium truncate">{node.name}</span>
        {node.children && node.children.length > 0 && (
          <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{node.children.length}</span>
        )}
      </div>

      {/* Recursively render subtree descendants */}
      <div
        className={`transition-opacity duration-75 overflow-hidden ${
          isExpanded ? 'opacity-100 max-h-none' : 'opacity-0 max-h-0'
        }`}
      >
        {node.children && node.children.length > 0 && renderFileTree(node.children, bucketName, currentPath)}
      </div>
    </>
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
