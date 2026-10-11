import { useRef, useState } from "react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useMutateUpload } from "@/lib/query";
import { buildUploadFormData } from "@/lib/upload-form-data";
import { cn } from "@/lib/utils";

import { FolderSelect } from "./folder-select";
import { UploadImageGrid } from "./image-grid";
import { EUploadState, useUpload } from "./provider";

// TODO: modify strucutre to allow for custom properties prior to submission
// eg: "isRenaming"...
// type ImageItem = {
//   file: File
//   isRenaming: boolean
// }

const SubmitButton = ({ hasImages, onClick }: { hasImages: boolean; onClick: () => void }) => (
	<button
		type="button"
		className={cn(
			"bg-neutral-300 px-4 py-2 rounded-sm text-neutral-900",
			!hasImages && "bg-neutral-600 text-neutral-400",
		)}
		onClick={onClick}
		disabled={!hasImages}
	>
		Upload
	</button>
);

export const UploadScreen = () => {
	const [images, setImages] = useState<File[]>([]);
	const folderPathRef = useRef<string>("");

	const { bucketName, bucketRegion } = useExplorer().state;
	const { setUploadState, setUploadResponse } = useUpload();
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

			// TODO: set toast or success message
		} catch (e) {
			setUploadState(EUploadState.Error);
			setUploadResponse(null);
			console.warn(e);
		}
	};

	return (
		<div className="flex flex-col max-h-[calc(100dvh-200px)]">
			<FolderSelect folderPathRef={folderPathRef} />
			<UploadImageGrid setImages={setImages} mainImage={images[0]} restImages={images.slice(1)} />

			<div className="flex justify-center pt-6">
				<SubmitButton hasImages={images.length > 0} onClick={handleSubmit} />
			</div>
		</div>
	);
};
