import { createContext, type Dispatch, type SetStateAction, useContext, useState } from 'react'

type UploadState = 'idle' | 'uploading' | 'complete'

type UploadProviderContext = {
  state: {
    uploadState: UploadState
  }
  actions: {
    setUploadState: Dispatch<SetStateAction<UploadState>>
  }
}

const UploadContext = createContext<UploadProviderContext | null>(null)

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [uploadState, setUploadState] = useState<UploadState>('idle')

  const value = {
    state: { uploadState },
    actions: { setUploadState }
  }

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export const useUpload = () => {
  const context = useContext(UploadContext)

  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }

  return context
}
