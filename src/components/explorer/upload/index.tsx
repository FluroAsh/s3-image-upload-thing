import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type UploadTriggerProps = {
  buttonText: string
}

export const UploadTrigger = ({ buttonText }: UploadTriggerProps) => {
  return (
    <Dialog>
      <DialogTrigger className="p-2.5 font-bold bg-yellow-600 rounded-sm">{buttonText}</DialogTrigger>

      <DialogContent className="max-w-[700px] w-full">
        <DialogTitle>Upload</DialogTitle>
        <div className="h-[500px] "></div>
      </DialogContent>
    </Dialog>
  )
}
