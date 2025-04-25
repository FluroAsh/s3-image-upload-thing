import { useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'

import { useMutateUpload } from '@/lib/query'
import { cn } from '@/lib/utils'
import { EUploadState, useUpload } from './provider'

// TODO: modify strucutre to allow for custom properties prior to submission
// eg: "isRenaming"...
type ImageItem = {
  file: File
  isRenaming: boolean
}

export const UploadScreen = () => {
  const [images, setImages] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  // TODO: Access first bucket as fallback if no param
  const bucketName = useSearchParams().get('bucket')

  const { setUploadState } = useUpload()

  const { mutateAsync: postUploadImages } = useMutateUpload(bucketName ?? '')

  const handleSubmit = async () => {
    try {
      if (!bucketName) {
        throw new Error('Unable to find name of bucket.')
      }

      setUploadState(EUploadState.Uploading)

      const formData = new FormData()
      formData.append('bucketName', bucketName ?? '')

      images.forEach((file) => {
        formData.append('images', file, file.name)
      })

      const successMessage = await postUploadImages(formData)
      console.log(successMessage)
      setUploadState(EUploadState.Complete)
      // TODO: set toast or success message
    } catch (e) {
      setUploadState(EUploadState.Error)
      console.warn(e)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = new Array(...e.target.files)
      setImages((prevImages) => [...prevImages, ...newImages])
    }
  }

  const triggerFileInput = () => {
    inputRef.current?.click()
  }

  const mainImage = images[0]
  const restImages = images.slice(1)

  return (
    <div className="flex flex-col max-h-[calc(100dvh-200px)]">
      {/* Main Image Area */}
      <div id="main-image" className="h-[450px] rounded-md overflow-hidden mb-4">
        {mainImage ? (
          <img className="size-full object-cover" src={URL.createObjectURL(mainImage)} />
        ) : (
          <div
            className="border-neutral-500 border-2 border-dashed grid place-items-center hover:cursor-pointer h-full"
            onClick={triggerFileInput}
          >
            Upload Image
          </div>
        )}
      </div>

      {/* Additional Images */}
      <div className="overflow-y-auto">
        <div className="grid grid-cols-4 gap-y-4">
          {restImages.map((image, i) => (
            <div key={`preview-image-${i}`} className="size-[150px] overflow-hidden">
              <img className="size-full object-cover object-center rounded-md" src={URL.createObjectURL(image)} />
            </div>
          ))}

          {/* Add Image Controls */}
          <button
            onClick={triggerFileInput}
            className="size-[150px] border-2 border-dashed border-neutral-500 rounded-md hover:bg-neutral-500/10 transition-colors"
          >
            Add Image
          </button>
        </div>
      </div>

      <div className="flex justify-center pt-6">
        {/* Disabled if no items added */}
        <button
          className={cn(
            'bg-neutral-300 px-4 py-2 rounded-sm text-neutral-900',
            images.length === 0 && 'bg-neutral-600 text-neutral-400'
          )}
          onClick={handleSubmit}
          disabled={images.length === 0}
        >
          Upload
        </button>
      </div>

      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} ref={inputRef} multiple />
    </div>
  )
}
