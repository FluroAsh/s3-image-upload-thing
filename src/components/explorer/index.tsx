'use client'

import { cn } from '@/lib/utils'
// TODO: Handle the explorer state within the explorer component
// TODO: use context provider to manage state between the panels

import { TreeNode } from '@/services/s3'
import { ExplorerProvider, useExplorer } from './explorer-provider'

const Explorer = ({ bucketName, children }: { bucketName: string | undefined; children: React.ReactNode }) => {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

  return (
    <div>
      <h3>{bucketName}</h3>
      <div className="bg-pink-600">Navigation (Back & Forward)</div>
      <div id="explorer-container" className="grid grid-cols-[1fr_0.7fr] h-[700px] overflow-hidden">
        <ExplorerProvider>{children}</ExplorerProvider>
      </div>
    </div>
  )
}

// ---- View Panel ---- //
const depthMap = {
  0: undefined,
  1: 'pl-4',
  2: 'pl-8',
  3: 'pl-12',
  4: 'pl-16',
  5: 'pl-20'
} as Record<string, string | undefined>

const renderFileTree = (nodes: TreeNode[], bucketName: string, prevPath = '') => (
  <ul>
    {nodes.map((node, idx) => {
      const { setActiveFile, resetState } = useExplorer().actions

      const currentPath = prevPath ? `${prevPath}/${node.name}` : node.name

      const handleClick = () => {
        if (node.isFolder) return
        // set URL:
        // `https://${bucket_name}.s3.${s3_region}.amazonaws.com/${currentPath}

        // Set the "active" file based on current path
        // obj with { fileName: string, filePath: currentPath, type: "image", "text" etc. }
        // then we can use this to fetch a presigned image if needed in the "preview" panel
        console.log(
          'currentPath:',
          currentPath,
          'Object URL:',
          `https://${bucketName}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${currentPath}`
        )
        setActiveFile(currentPath)
      }

      const handleContextMenu = (e: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => {
        // TODO: Add custom context menu implementation for actions (Upload, delete, edit etc).s
        e.preventDefault()
        console.log('Context menu || tree node')

        const { clientX: mouseX, clientY: mouseY } = event as MouseEvent
        console.log({ mouseX, mouseY })

        // const container = document.createElement('div')
      }

      return (
        <li key={idx}>
          <p
            className={cn(
              'text-sm hover:cursor-pointer select-none transition-colors duration-75 hover:bg-sky-400',
              depthMap[node.depth]
            )}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
            {node.isFolder ? '📂' : '📝'}&nbsp;{node.name}
          </p>
          {node.children && node.children.length > 0 && renderFileTree(node.children, bucketName, currentPath)}
        </li>
      )
    })}
  </ul>
)

const ViewPanel = ({ fileTree, bucketName }: { fileTree: TreeNode[]; bucketName: string }) => {
  return (
    <nav className="bg-sky-600 h-full overflow-y-auto overflow-x-hidden">
      <ul>{renderFileTree(fileTree, bucketName)}</ul>
    </nav>
  )
}

const ActivePanel = () => {
  // 1. Get active file
  // 1.1. Render appropriate layout baesd on VALID file type (img, text, )
  // 2. If no active file, return a placeholder component

  const { state } = useExplorer()

  return (
    <div className="bg-sky-500">
      <p>ActivePanel</p>
      <pre className="text-neutral-100 font-bold">{state.activeFile}</pre>
    </div>
  )
}

export { Explorer, ViewPanel, ActivePanel }
