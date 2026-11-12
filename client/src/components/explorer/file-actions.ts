import { baseURL } from "@/lib/ofetch";
import type { BucketLocation } from "~/shared/types";

/** A presigned URL without its signature: the address the CDN serves the object at. */
export const publicUrlOf = (presignedUrl: string) => presignedUrl.split("?")[0];

/** Navigates to the server's download route, which redirects to a save-as-attachment URL; the bucket sends no CORS headers, so a fetch-and-save is blocked and the `download` attribute is ignored cross-origin. */
export const saveFile = (key: string, { bucketName, bucketRegion }: BucketLocation) => {
	const query = new URLSearchParams({ bucket: bucketName, region: bucketRegion, key });
	window.location.href = `${baseURL}/storage/download?${query}`;
};
