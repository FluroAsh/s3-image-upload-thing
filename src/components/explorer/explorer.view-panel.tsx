import { useFileTree } from '@/lib/query'
import { useExplorer } from '@/lib/providers/explorer-provider'

import { renderFileTree } from '.'

export const ExplorerViewPanel = () => {
  const { bucketName } = useExplorer().state
  const { data: fileTree, isLoading } = useFileTree(bucketName)

  if (isLoading) {
    return <p>Loading...</p>
  }

  return (
    <nav className="bg-sky-900 overflow-y-auto overflow-x-hidden">
      {fileTree ? <ul>{renderFileTree(fileTree, bucketName)}</ul> : <div>No Objects</div>}
    </nav>
  )
}
