/** Multipart field names of an upload request, shared by the admin client and the server. */
export const UPLOAD_FIELD = {
	BucketName: "bucketName",
	BucketRegion: "bucketRegion",
	Destination: "destination",
	Images: "images",
} as const;

/** How each file of an upload ended: `refused` for a file turned away by a rule, `failed` for an unexpected error. */
export const UPLOAD_STATUSES = ["stored", "refused", "failed"] as const;
