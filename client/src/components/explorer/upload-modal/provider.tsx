import { createContext, useContext, useRef, useState } from "react";

import { serverErrorMessage } from "@/components/explorer/utils";
import type { ApiError } from "@/lib/ofetch";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useMutateUpload } from "@/lib/query";
import { type PickedFile, pickFile } from "@/lib/upload-files";
import type { UploadResponse } from "~/shared/types";

export const EUploadState = {
	Idle: "Idle",
	Uploading: "Uploading",
	Complete: "Complete",
	Error: "Error",
} as const;

export type UploadState = (typeof EUploadState)[keyof typeof EUploadState];

type UploadProviderContext = {
	/** Which screen the modal shows. */
	uploadState: UploadState;
	/** The server's per-file results; `null` before a response. */
	uploadResponse: UploadResponse | null;
	/** The server's message for a failed request; `null` when none was sent. */
	uploadError: string | null;
	/** Files of the current send whose request has finished, out of `total` sent. */
	progress: { done: number; total: number };
	/** Picked files; kept through the error and complete screens so they can be retried. */
	files: PickedFile[];
	/** Folder path the sets are created in, without a trailing slash; `""` for the bucket root. */
	destination: string;
	/** Sets the destination folder; pass `""` for the bucket root. */
	setDestination: (destination: string) => void;
	/** Adds the image files among `incoming` to the picked list, reading their dimensions. */
	addFiles: (incoming: File[]) => Promise<void>;
	/** Drops one picked file by its row id. */
	removeFile: (id: string) => void;
	/** Uploads every picked file. */
	submit: () => Promise<void>;
	/** Resends the files the last response marked `failed`, keeping the other results. */
	retryFailed: () => Promise<void>;
	/** Repeats the request that just failed, minus any file removed since. */
	retryLast: () => Promise<void>;
	/** Back to the file picker with the files kept, dropping those that were stored. */
	backToFiles: () => void;
	/** Back to an empty file picker in the same destination. */
	uploadMore: () => void;
	/** Back to the first screen with no files and the root destination. */
	resetState: () => void;
};

const UploadContext = createContext<UploadProviderContext | null>(null);

export const UploadProvider = ({ children }: { children: React.ReactNode }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { mutateAsync: uploadImages } = useMutateUpload(bucketName);

	const [uploadState, setUploadState] = useState<UploadState>(EUploadState.Idle);
	const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [progress, setProgress] = useState({ done: 0, total: 0 });
	const [files, setFiles] = useState<PickedFile[]>([]);
	const [destination, setDestination] = useState("");
	const lastSend = useRef<{ batch: PickedFile[]; merge: boolean }>({ batch: [], merge: false });

	const send = async (batch: PickedFile[], merge: boolean) => {
		lastSend.current = { batch, merge };
		try {
			if (!bucketName || !bucketRegion) throw new Error("Unable to find the active bucket and region.");

			setUploadError(null);
			setProgress({ done: 0, total: batch.length });
			setUploadState(EUploadState.Uploading);
			const results = await uploadImages({
				bucketRegion,
				destination,
				images: batch.map(({ file }) => file),
				onSettled: () => setProgress((previous) => ({ ...previous, done: previous.done + 1 })),
			});
			const retried = new Map(results.map((result) => [result.file, result]));
			setUploadResponse((previous) =>
				merge && previous
					? { results: previous.results.map((result) => retried.get(result.file) ?? result) }
					: { results },
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

	const retryLast = () => {
		const listed = new Set(files.map(({ id }) => id));
		return send(
			lastSend.current.batch.filter(({ id }) => listed.has(id)),
			lastSend.current.merge,
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
				progress,
				files,
				destination,
				setDestination,
				addFiles,
				removeFile: (id) => setFiles((previous) => previous.filter((picked) => picked.id !== id)),
				submit: () => send(files, false),
				retryFailed,
				retryLast,
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
