import { createContext, type Dispatch, type SetStateAction, useContext, useState } from 'react'

export enum EUploadState {
  Idle = 'Idle',
  Uploading = 'Uploading',
  Complete = 'Complete',
  Error = 'Error'
}

export type UploadState = keyof typeof EUploadState

type UploadProviderContext = {
  uploadState: UploadState
  setUploadState: Dispatch<SetStateAction<UploadState>>
}

const UploadContext = createContext<UploadProviderContext | null>(null)

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [uploadState, setUploadState] = useState<UploadState>(EUploadState.Idle)

  return <UploadContext.Provider value={{ uploadState, setUploadState }}>{children}</UploadContext.Provider>
}

export const useUpload = () => {
  const context = useContext(UploadContext)

  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }

  return context
}
