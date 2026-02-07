import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";

import { type UploadSuccess } from "@/types/api";

export enum EUploadState {
  Idle = "Idle",
  Uploading = "Uploading",
  Complete = "Complete",
  Error = "Error",
}

export type UploadState = keyof typeof EUploadState;

type UploadProviderContext = {
  uploadState: UploadState;
  uploadResponse: UploadSuccess | null;
  setUploadState: Dispatch<SetStateAction<UploadState>>;
  setUploadResponse: Dispatch<SetStateAction<UploadSuccess | null>>;
  resetState: () => void;
};

const UploadContext = createContext<UploadProviderContext | null>(null);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [uploadState, setUploadState] = useState<UploadState>(
    EUploadState.Idle,
  );
  const [uploadResponse, setUploadResponse] = useState<UploadSuccess | null>(
    null,
  );

  const resetState = () => {
    setUploadState(EUploadState.Idle);
    setUploadResponse(null);
  };

  return (
    <UploadContext.Provider
      value={{
        uploadState,
        uploadResponse,
        setUploadState,
        setUploadResponse,
        resetState,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);

  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }

  return context;
};
