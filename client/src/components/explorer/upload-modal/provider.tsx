import { createContext, type Dispatch, type SetStateAction, useContext, useState } from "react";

import type { UploadResponse } from "~/shared/types";

export const EUploadState = {
	Idle: "Idle",
	Uploading: "Uploading",
	Complete: "Complete",
	Error: "Error",
} as const;

export type UploadState = (typeof EUploadState)[keyof typeof EUploadState];

type UploadProviderContext = {
	uploadState: UploadState;
	uploadResponse: UploadResponse | null;
	/** The server's message for a failed request; `null` when none was sent. */
	uploadError: string | null;
	setUploadState: Dispatch<SetStateAction<UploadState>>;
	setUploadResponse: Dispatch<SetStateAction<UploadResponse | null>>;
	setUploadError: Dispatch<SetStateAction<string | null>>;
	resetState: () => void;
};

const UploadContext = createContext<UploadProviderContext | null>(null);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
	const [uploadState, setUploadState] = useState<UploadState>(EUploadState.Idle);
	const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const resetState = () => {
		setUploadState(EUploadState.Idle);
		setUploadResponse(null);
		setUploadError(null);
	};

	return (
		<UploadContext.Provider
			value={{
				uploadState,
				uploadResponse,
				uploadError,
				setUploadState,
				setUploadResponse,
				setUploadError,
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
