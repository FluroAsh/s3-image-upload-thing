import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EUploadState, type UploadState, useUpload } from './provider'
import { UploadScreen } from './upload-screen'
import { type Variant } from '@/types/api'

const ModalScreens = {
  [EUploadState.Idle]: {
    title: 'Upload',
    component: UploadScreen
  },
  [EUploadState.Uploading]: {
    title: 'Upload in Progress',
    component: ProcessingScreen
  },
  [EUploadState.Error]: {
    title: 'Upload Error',
    component: ErrorScreen
  },
  [EUploadState.Complete]: {
    title: 'Upload Success!',
    component: CompleteScreen
  }
} satisfies Record<UploadState, { title: string; component: React.FC }>

type UploadTriggerProps = { buttonText: string }

export const UploadTrigger = ({ buttonText }: UploadTriggerProps) => {
  const { uploadState, resetState } = useUpload()

  const Screen = ModalScreens[uploadState].component
  const title = ModalScreens[uploadState].title

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(resetState, 500) // Prevents visual flicker before dialog has fully closed
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger className="p-2.5 font-bold bg-yellow-600 rounded-sm">{buttonText}</DialogTrigger>

      <DialogContent className="max-w-[700px] w-full">
        <DialogTitle>{title}</DialogTitle>
        <div className="min-h-[500px]">
          <Screen />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProcessingScreen() {
  return <p>Please wait... Processing your images...</p>
}

const variantSizeLabel: Record<Variant, string> = {
  thumbnail: 'thmb',
  medium: 'md',
  large: 'lg'
}

function CompleteScreen() {
  const { uploadResponse } = useUpload()
  const files = uploadResponse?.files
  const groupCount = files?.length || 0
  const variantCount = files?.reduce((count, group) => count + group.length, 0) || 0

  return (
    <div>
      <p className="text-base text-neutral-300 mt-2 mb-4 font-medium">
        Successfully uploaded {variantCount} {variantCount === 1 ? 'variant' : 'variants'} across {groupCount}{' '}
        {groupCount === 1 ? 'image' : 'images'}.
      </p>

      <div className="max-h-[700px] overflow-y-auto space-y-3 pr-2">
        {files?.map((fileGroup, i) => (
          <div key={`group-${i}`} className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
            <h4 className="text-sm font-medium text-neutral-200 mb-2">Group {i + 1}</h4>
            <div className="space-y-2">
              {fileGroup.map((file, i) => (
                <div
                  key={`variant-${file.fileName}-${i}`}
                  className="flex items-center justify-between bg-neutral-700 rounded-md p-2 border border-neutral-600 hover:border-neutral-500 transition-colors"
                >
                  <span className="mr-2 bg-blue-900 text-blue-200 text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide pointer-events-none">
                    {variantSizeLabel[file.variant]}
                  </span>

                  <a
                    href={file.imageURL}
                    target="_blank"
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium truncate mr-2 flex-1"
                  >
                    {file.fileName}
                  </a>
                  <span className="text-xs text-neutral-300 whitespace-nowrap">{file.size}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorScreen() {
  return (
    <div>
      <p>Uh oh, we ran into an error!</p>
    </div>
  )
}
