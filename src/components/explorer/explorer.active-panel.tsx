import { LucideExternalLink, LucideImage, LucideLink, LucideFile } from 'lucide-react'

import { getVariantType, replaceFileSegment } from './utils'
import { isImageFile } from '@/lib/helpers'
import { TreeNode } from '@/services/s3'

import { useExplorer } from '@/lib/providers/explorer-provider'

type ActiveVariantProps = {
  variant: TreeNode
  remoteURL: string
}

const ActiveVariant = ({ variant, remoteURL }: ActiveVariantProps) => {
  return (
    <li className="group">
      <a
        target="_blank"
        className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/50 hover:border-sky-500/50 transition-all duration-200"
        href={replaceFileSegment(remoteURL, variant.name)}
      >
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-sky-400"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-100">{getVariantType(variant.name)}</span>
            <span className="text-xs text-slate-300">{variant.size}</span>
          </div>
        </div>
        <LucideExternalLink className="size-4 text-slate-400 group-hover:text-sky-300 transition-colors" />
      </a>
    </li>
  )
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center size-full p-8 text-center">
    <div className="size-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
      <LucideFile className="size-8 text-sky-400" />
    </div>
    <h3 className="text-lg font-medium text-neutral-100 mb-2">No file selected</h3>
    <p className="text-sm text-slate-300 max-w-sm">
      Select a file or image from the explorer to view its details and preview
    </p>
  </div>
)

const PREVIEW_CONTAINER_SIZE = 600

export const ExplorerActivePanel = () => {
  const {
    activeFile: { remoteURL, fileName, variants }
  } = useExplorer().state

  if (!remoteURL) {
    return (
      <div className="bg-slate-800 border-l border-slate-700 size-full min-w-[450px] flex-1">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border-l border-slate-700 size-full min-w-[450px] flex-1 overflow-y-auto overflow-x-hidden">
      {/* Header - Even lighter for hierarchy */}
      <div className="border-b border-slate-600 p-6 bg-slate-750">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
            {isImageFile(remoteURL) ? (
              <LucideImage className="size-5 text-sky-400" />
            ) : (
              <LucideFile className="size-5 text-sky-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">{fileName || 'Active File'}</h2>
            <p className="text-sm text-slate-300">File Preview & Details</p>
          </div>
        </div>
      </div>

      {/* Remote URL Section */}
      <div className="p-6 border-b border-slate-600">
        <div className="flex items-center gap-2 mb-3">
          <LucideLink className="size-4 text-sky-400" />
          <h3 className="text-sm font-medium text-neutral-100">Remote URL</h3>
        </div>
        <a
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 p-3 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-sky-500/50 transition-all duration-200 group w-full"
          href={remoteURL}
        >
          <span className="text-sm text-neutral-100 break-all flex-1">{remoteURL}</span>
          <LucideExternalLink className="size-4 text-sky-400 group-hover:text-sky-300 transition-colors flex-shrink-0" />
        </a>
      </div>

      {/* Image Preview Section */}
      {isImageFile(remoteURL) && (
        <div className="p-6 border-b border-slate-600">
          <div className="flex items-center gap-2 mb-4">
            <LucideImage className="size-4 text-sky-400" />
            <h3 className="text-sm font-medium text-neutral-100">Preview</h3>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-slate-500 bg-slate-700/30">
            <div
              className="mx-auto flex items-center justify-center max-w-full"
              style={{
                minWidth: `${PREVIEW_CONTAINER_SIZE}px`,
                height: `${PREVIEW_CONTAINER_SIZE}px`
              }}
            >
              <img src={remoteURL} alt={fileName || 'Preview'} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Variants Section */}
      {variants && variants.length > 0 && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-4 rounded bg-sky-500"></div>
            <h3 className="text-sm font-medium text-neutral-100">Available Variants</h3>
            <span className="text-xs bg-slate-700 text-sky-300 px-2 py-1 rounded-full">{variants.length}</span>
          </div>
          <ul className="space-y-2">
            {variants.map((variant) => (
              <ActiveVariant key={`variant-${variant.name}`} variant={variant} remoteURL={remoteURL} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
