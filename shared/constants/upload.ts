/** Multipart field names of an upload request, shared by the admin client and the server. */
export const UPLOAD_FIELD = {
	BucketName: "bucketName",
	BucketRegion: "bucketRegion",
	Destination: "destination",
	Images: "images",
} as const;
