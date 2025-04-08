'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

import { TreeNode } from '@/services/s3'
import { isImageFile } from '@/lib/helpers'
import { Navigation } from './navigation'
import { ExplorerProvider, useExplorer } from '../../lib/providers/explorer-provider'

const Explorer = ({ bucketName, children }: { bucketName: string | undefined; children: React.ReactNode }) => {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

  return (
    <div>
      <h3>{bucketName}</h3>
      <ExplorerProvider>
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

// ---------------------//
// ---- View Panel ---- //
// ---------------------//
const depthPaddingMap = {
  0: undefined,
  1: 'pl-4',
  2: 'pl-8',
  3: 'pl-12',
  4: 'pl-16',
  5: 'pl-20'
} as Record<string, string | undefined>

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
        depthPaddingMap[node.depth]
      )}
      onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
    >
      📝&nbsp;{node.name}
    </p>
  )
}

const Folder = ({ node, bucketName, currentPath }: { node: TreeNode; bucketName: string; currentPath: string }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  return node.isFolder ? (
    <div>
      <div
        className={cn(
          'text-sm hover:cursor-pointer select-none transition-colors duration-75 hover:bg-sky-600',
          depthPaddingMap[node.depth]
        )}
        onClick={() => setIsExpanded((prevState) => !prevState)}
      >
        {isExpanded ? '📂' : '📁'}&nbsp;{node.name}
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

const renderFileTree = (nodes: TreeNode[], bucketName: string, prevPath = '') => (
  <ul>
    {nodes.map((node, idx) => {
      const currentPath = prevPath ? `${prevPath}/${node.name}` : node.name

      return (
        <li key={idx}>
          <Folder node={node} bucketName={bucketName} currentPath={currentPath} />
        </li>
      )
    })}
  </ul>
)

const ExplorerViewPanel = ({ fileTree, bucketName }: { fileTree: TreeNode[] | undefined; bucketName: string }) => {
  return (
    <nav className="bg-sky-900 overflow-y-auto overflow-x-hidden">
      {fileTree ? <ul>{renderFileTree(fileTree, bucketName)}</ul> : <div>No Objects</div>}
    </nav>
  )
}

// -----------------------//
// ---- Active Panel ---- //
// -----------------------//
const ExplorerActivePanel = () => {
  const {
    activeFile: { remoteURL }
  } = useExplorer().state

  return (
    <div className="bg-sky-700 justify-center items-center gap-4">
      <div className="p-4">
        <h3 className="mr-1 font-bold ">Remote URL</h3>
        <a
          target="_blank"
          className="text-neutral-100 hover:text-green-300 underline hover:no-underline break-all"
          href={remoteURL ?? ''}
        >
          {remoteURL ?? 'No active file'}
        </a>
      </div>

      {isImageFile(remoteURL) && (
        <div className="mx-auto p-4 text-center">
          <span className="font-bold">Preview</span>
          <div id="preview-container" className="size-[600px] overflow-hidden mx-auto">
            <img src={remoteURL} className="w-full h-full object-scale-down aspect-square bg-slate-600/50" />
          </div>
        </div>
      )}
    </div>
  )
}

export { Explorer, ExplorerViewPanel, ExplorerActivePanel }
