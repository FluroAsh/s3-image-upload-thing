import { TreeNode } from '@/services/s3'
import { isImageFile } from '@/lib/helpers'
import { replaceFileSegment } from './utils'

import { useExplorer } from '@/lib/providers/explorer-provider'

const ActiveVariant = ({ variant, remoteURL }: { variant: TreeNode; remoteURL: string }) => (
  <li className="transition-colors duration-75 hover:no-underline">
    <a
      key={`variant-${variant.name}`}
      target="_blank"
      className="text-neutral-100 hover:text-green-300 underline hover:no-underline break-all"
      href={replaceFileSegment(remoteURL, variant.name)}
    >
      {variant.name}
    </a>
  </li>
)

export const ExplorerActivePanel = () => {
  const {
    activeFile: { remoteURL, variants }
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

      {variants && variants.length > 0 && (
        <ul className="p-4">
          {variants.map((v) => (
            <ActiveVariant key={`variant-${v.name}`} variant={v} remoteURL={replaceFileSegment(remoteURL, v.name)} />
          ))}
        </ul>
      )}
    </div>
  )
}
