import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useUpload } from './provider'
import { UploadScreen } from './upload-screen'

type UploadTriggerProps = {
  buttonText: string
}

type UploadState = 'idle' | 'uploading' | 'complete'

const screens = {
  idle: {
    title: 'Upload',
    component: UploadScreen
  },
  uploading: {
    title: 'Uploading... Please wait...',
    component: ProcessingScreen
  },
  complete: {
    title: 'Images succesfully uploaded!',
    component: CompleteScreen
  }
} satisfies Record<UploadState, { title: string; component: React.FC }>

export const UploadTrigger = ({ buttonText }: UploadTriggerProps) => {
  const {
    state: { uploadState }
  } = useUpload()

  const Screen = screens[uploadState].component
  const title = screens[uploadState].title

  return (
    <Dialog>
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
