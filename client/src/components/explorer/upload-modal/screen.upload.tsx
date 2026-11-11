import { useRef, useState } from "react";

import { serverErrorMessage } from "@/components/explorer/utils";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/ofetch";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useMutateUpload } from "@/lib/query";
import { buildUploadFormData } from "@/lib/upload-form-data";

import { FolderSelect } from "./folder-select";
import { UploadImageGrid } from "./image-grid";
import { EUploadState, useUpload } from "./provider";

export const UploadScreen = () => {
	const [images, setImages] = useState<File[]>([]);
	const folderPathRef = useRef<string>("");

	const { bucketName, bucketRegion } = useExplorer().state;
	const { setUploadState, setUploadResponse, setUploadError } = useUpload();
	const { mutateAsync: postUploadImages } = useMutateUpload(bucketName);

	const handleSubmit = async () => {
		try {
			if (!bucketName || !bucketRegion) throw new Error("Unable to find the active bucket and region.");

			setUploadState(EUploadState.Uploading);

			const response = await postUploadImages(
				buildUploadFormData({ bucketName, bucketRegion, destination: folderPathRef.current, images }),
			);
			setUploadResponse(response);
			setUploadState(EUploadState.Complete);
		} catch (e) {
			setUploadState(EUploadState.Error);
			setUploadResponse(null);
			setUploadError(serverErrorMessage(e as ApiError, (e as Error).message));
			console.warn(e);
		}
	};

	return (
		<div className="flex flex-col max-h-[calc(100dvh-200px)]">
			<FolderSelect folderPathRef={folderPathRef} />
			<UploadImageGrid setImages={setImages} mainImage={images[0]} restImages={images.slice(1)} />

			<div className="flex justify-center pt-6">
				<Button variant="primary" disabled={images.length === 0} onClick={handleSubmit}>
					Upload
				</Button>
			</div>
		</div>
	);
};
