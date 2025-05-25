import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EUploadState, type UploadState, useUpload } from './provider'
import { UploadScreen } from './upload-screen'

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
  const { uploadState, setUploadState } = useUpload()

  const Screen = ModalScreens[uploadState].component
  const title = ModalScreens[uploadState].title

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Prevents visual flicker before dialog has fully closed
      setTimeout(() => setUploadState(EUploadState.Idle), 500)
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

function CompleteScreen() {
  return (
    <div>
      <h3>Images succesfully uploaded!</h3>
      <p>Image 1 URL</p>
      <p>Image 2 URL</p>
      <p>Image 3 URL</p>
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
