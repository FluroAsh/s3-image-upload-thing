import { UploadTrigger } from './upload'
import { UploadProvider } from './upload/provider'

export const Navigation = () => {
  return (
    <div className="bg-pink-600 flex gap-4 p-2">
      <div className="p-2.5 font-bold bg-gray-500 text-gray-300 rounded-md">Navigation</div>

      <UploadProvider>
        <UploadTrigger buttonText="Upload" />
      </UploadProvider>
    </div>
  )
}
