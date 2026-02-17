import { useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { useBuckets, useMutateUpload } from "@/lib/query";
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

	const { data: bucketData } = useBuckets();
	const bucketName = useSearchParams().get("bucket") || bucketData?.buckets?.[0]?.Name;

	const { setUploadState, setUploadResponse } = useUpload();
	const { mutateAsync: postUploadImages } = useMutateUpload(bucketName ?? "");

	const handleSubmit = async () => {
		try {
			if (!bucketName) throw new Error("Unable to find name of bucket.");

			setUploadState(EUploadState.Uploading);

			const formData = new FormData();
			formData.append("bucketName", bucketName ?? "");
			formData.append("destination", folderPathRef.current);

			images.forEach((file) => {
				formData.append("images", file, file.name);
			});

			const response = await postUploadImages(formData);
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
