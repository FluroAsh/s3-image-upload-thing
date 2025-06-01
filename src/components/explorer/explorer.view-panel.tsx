import { LucideFolder, LucideLoader2, LucideCloud, LucideDatabase } from 'lucide-react'

import { useFileTree } from '@/lib/query'
import { useExplorer } from '@/lib/providers/explorer-provider'
import { useHasMounted } from '@/hooks/useHasMounted'

import { renderFileTree } from './index'

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <LucideLoader2 className="size-8 text-slate-400 animate-spin mb-4" />
    <p className="text-sm text-slate-300">Loading file tree...</p>
  </div>
)

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="size-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
      <LucideFolder className="size-8 text-slate-400" />
    </div>
    <h3 className="text-sm font-medium text-neutral-100 mb-2">No files found</h3>
    <p className="text-xs text-slate-400 max-w-xs">This bucket appears to be empty or the files are still loading</p>
  </div>
)

const BucketHeader = ({ bucketName }: { bucketName: string }) => (
  <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
    <div className="flex items-center gap-3">
      <div className="size-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
        <LucideDatabase className="size-4 text-sky-400" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-neutral-100">{bucketName}</h2>
      </div>
    </div>
  </div>
)

export const ExplorerViewPanel = () => {
  const { bucketName } = useExplorer().state
  const { data: nodes, isLoading } = useFileTree(bucketName)
  const hasMounted = useHasMounted()

  // Show loading during SSR/hydration or when actually loading
  const shouldShowLoading = !hasMounted || isLoading

  return (
    <nav className="flex-1 bg-slate-900 border-r border-slate-700 overflow-y-auto">
      <BucketHeader bucketName={bucketName} />

      <div>
        {shouldShowLoading ? (
          <LoadingState />
        ) : nodes ? (
          <ul key={`file-tree-${bucketName}`} className="space-y-1 p-2">
            {renderFileTree(nodes, bucketName)}
          </ul>
        ) : (
          <EmptyState />
        )}
      </div>
    </nav>
  )
}
