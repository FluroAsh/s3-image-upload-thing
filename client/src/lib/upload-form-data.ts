type UploadFormDataInput = {
	/** Name of the bucket the variants are written to. */
	bucketName: string;
	/** AWS region of that bucket; the server rejects the upload without it. */
	bucketRegion: string;
	/** Folder path inside the bucket to upload into; empty for the bucket root. */
	destination: string;
	/** Files to upload, each sent under its own file name. */
	images: File[];
};

export const buildUploadFormData = ({ bucketName, bucketRegion, destination, images }: UploadFormDataInput) => {
	const formData = new FormData();
	formData.append("bucketName", bucketName);
	formData.append("bucketRegion", bucketRegion);
	formData.append("destination", destination);
	for (const file of images) formData.append("images", file, file.name);

	return formData;
};
