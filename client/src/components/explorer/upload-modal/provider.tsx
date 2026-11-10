import { createContext, type Dispatch, type SetStateAction, useContext, useState } from "react";

import type { UploadResponse } from "~/shared/types";

export enum EUploadState {
	Idle = "Idle",
	Uploading = "Uploading",
	Complete = "Complete",
	Error = "Error",
}

export type UploadState = keyof typeof EUploadState;

type UploadProviderContext = {
	uploadState: UploadState;
	uploadResponse: UploadResponse | null;
	setUploadState: Dispatch<SetStateAction<UploadState>>;
	setUploadResponse: Dispatch<SetStateAction<UploadResponse | null>>;
	resetState: () => void;
};

const UploadContext = createContext<UploadProviderContext | null>(null);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
	const [uploadState, setUploadState] = useState<UploadState>(EUploadState.Idle);
	const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);

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
