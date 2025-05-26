import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { EUploadState, type UploadState, useUpload } from './provider'

import { UploadScreen } from './screen.upload'
import { UploadingScreen } from './screen.uploading'
import { ErrorScreen } from './screen.error'
import { CompleteScreen } from './screen.complete'

const ModalScreens: Record<UploadState, { title: string; component: React.FC }> = {
  [EUploadState.Idle]: {
    title: 'Upload',
    component: UploadScreen
  },
  [EUploadState.Uploading]: {
    title: 'Upload in Progress',
    component: UploadingScreen
  },
  [EUploadState.Error]: {
    title: 'Upload Error',
    component: ErrorScreen
  },
  [EUploadState.Complete]: {
    title: 'Upload Success!',
    component: CompleteScreen
  }
}

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
