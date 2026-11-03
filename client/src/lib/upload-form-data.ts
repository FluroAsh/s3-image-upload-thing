import { UPLOAD_FIELD } from "~/shared/constants/upload";

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
	formData.append(UPLOAD_FIELD.BucketName, bucketName);
	formData.append(UPLOAD_FIELD.BucketRegion, bucketRegion);
	formData.append(UPLOAD_FIELD.Destination, destination);
	for (const file of images) formData.append(UPLOAD_FIELD.Images, file, file.name);

	return formData;
};
