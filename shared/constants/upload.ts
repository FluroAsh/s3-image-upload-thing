/** Multipart field names of an upload request, shared by the admin client and the server. */
export const UPLOAD_FIELD = {
	BucketName: "bucketName",
	BucketRegion: "bucketRegion",
	Destination: "destination",
	Images: "images",
} as const;
export type UploadField = (typeof UPLOAD_FIELD)[keyof typeof UPLOAD_FIELD];
