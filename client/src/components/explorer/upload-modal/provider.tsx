import { createContext, useContext, useRef, useState } from "react";

import { serverErrorMessage } from "@/components/explorer/utils";
import type { ApiError } from "@/lib/ofetch";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useMutateUpload } from "@/lib/query";
import { type PickedFile, pickFile } from "@/lib/upload-files";
import { buildUploadFormData } from "@/lib/upload-form-data";
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
	/** Picked files; kept through the error and complete screens so they can be retried. */
	files: PickedFile[];
	/** Folder path the sets are created in, without a trailing slash; `""` for the bucket root. */
	destination: string;
	setDestination: (destination: string) => void;
	addFiles: (incoming: File[]) => Promise<void>;
	removeFile: (id: string) => void;
	/** Uploads every picked file. */
	submit: () => Promise<void>;
	/** Resends the files the last response marked `failed`, keeping the other results. */
	retryFailed: () => Promise<void>;
	/** Repeats the request that just failed. */
	retryLast: () => Promise<void>;
	/** Back to the file picker with the files kept, dropping those that were stored. */
	backToFiles: () => void;
	/** Back to an empty file picker in the same destination. */
	uploadMore: () => void;
	resetState: () => void;
};

const UploadContext = createContext<UploadProviderContext | null>(null);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { mutateAsync: postUploadImages } = useMutateUpload(bucketName);

	const [uploadState, setUploadState] = useState<UploadState>(EUploadState.Idle);
	const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [files, setFiles] = useState<PickedFile[]>([]);
	const [destination, setDestination] = useState("");
	const lastSend = useRef<{ batch: PickedFile[]; merge: boolean }>({ batch: [], merge: false });

	const send = async (batch: PickedFile[], merge: boolean) => {
		lastSend.current = { batch, merge };
		try {
			if (!bucketName || !bucketRegion) throw new Error("Unable to find the active bucket and region.");

			setUploadError(null);
			setUploadState(EUploadState.Uploading);
			const response = await postUploadImages(
				buildUploadFormData({ bucketName, bucketRegion, destination, images: batch.map(({ file }) => file) }),
			);
			const retried = new Map(response.results.map((result) => [result.file, result]));
			setUploadResponse((previous) =>
				merge && previous
					? { results: previous.results.map((result) => retried.get(result.file) ?? result) }
					: response,
			);
			setUploadState(EUploadState.Complete);
		} catch (e) {
			setUploadState(EUploadState.Error);
			setUploadError(serverErrorMessage(e as ApiError, (e as Error).message));
			console.warn(e);
		}
	};

	const addFiles = async (incoming: File[]) => {
		const images = incoming.filter(({ type }) => type.startsWith("image/"));
		const picked = await Promise.all(images.map(pickFile));
		setFiles((previous) => [...previous, ...picked]);
	};

	const retryFailed = () => {
		const failed = new Set(uploadResponse?.results.filter(({ status }) => status === "failed").map(({ file }) => file));
		return send(
			files.filter(({ file }) => failed.has(file.name)),
			true,
		);
	};

	const backToFiles = () => {
		const stored = new Set(uploadResponse?.results.filter(({ status }) => status === "stored").map(({ file }) => file));
		setFiles((previous) => previous.filter(({ file }) => !stored.has(file.name)));
		setUploadResponse(null);
		setUploadError(null);
		setUploadState(EUploadState.Idle);
	};

	const uploadMore = () => {
		setFiles([]);
		backToFiles();
	};

	const resetState = () => {
		setUploadState(EUploadState.Idle);
		setUploadResponse(null);
		setUploadError(null);
		setFiles([]);
		setDestination("");
	};

	return (
		<UploadContext.Provider
			value={{
				uploadState,
				uploadResponse,
				uploadError,
				files,
				destination,
				setDestination,
				addFiles,
				removeFile: (id) => setFiles((previous) => previous.filter((picked) => picked.id !== id)),
				submit: () => send(files, false),
				retryFailed,
				retryLast: () => send(lastSend.current.batch, lastSend.current.merge),
				backToFiles,
				uploadMore,
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
