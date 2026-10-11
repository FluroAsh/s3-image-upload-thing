type UploadFormDataInput = {
	bucketName: string;
	bucketRegion: string;
	destination: string;
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
