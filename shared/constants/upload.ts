/** Multipart field names of an upload request, shared by the admin client and the server. */
export const UPLOAD_FIELD = {
	BucketName: "bucketName",
	BucketRegion: "bucketRegion",
	Destination: "destination",
	Images: "images",
} as const;

/** Multipart field that carries the original supplied for a set that keeps none. */
export const ORIGINAL_FIELD = "original";

/** How each file of an upload ended: `refused` for a file turned away by a rule, `failed` for an unexpected error. */
export const UPLOAD_STATUSES = ["stored", "refused", "failed"] as const;

/** Largest upload request the server accepts, in bytes; the client sends one file per request, so this caps a single photo. */
export const MAX_UPLOAD_REQUEST_BYTES = 100 * 1024 * 1024;
