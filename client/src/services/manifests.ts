import ofetch from "@/lib/ofetch";
import { bucketQuery, NO_RETRY } from "@/services/s3";
import { ORIGINAL_FIELD } from "~/shared/constants/upload";
import type { AttentionResponse, BucketLocation, GenerateSizesResponse, Manifest } from "~/shared/types";

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const getManifest = (set: string, location: BucketLocation): Promise<Manifest> =>
	ofetch<Manifest>(`/storage/manifests/${set}`, { ...NO_RETRY, query: bucketQuery(location) });

export const postGenerateSizes = (set: string, location: BucketLocation): Promise<GenerateSizesResponse> =>
	ofetch<GenerateSizesResponse>(`/storage/sizes/${set}`, { method: "POST", ...NO_RETRY, query: bucketQuery(location) });

export const postOriginal = (set: string, file: File, location: BucketLocation): Promise<GenerateSizesResponse> => {
	const body = new FormData();
	body.append(ORIGINAL_FIELD, file);
	return ofetch<GenerateSizesResponse>(`/storage/original/${set}`, {
		method: "POST",
		body,
		...NO_RETRY,
		query: bucketQuery(location),
	});
};

export const getAttention = (
	folder: string,
	{ all, cursor }: { all: boolean; cursor?: string },
	location: BucketLocation,
): Promise<AttentionResponse> =>
	ofetch<AttentionResponse>("/storage/attention", {
		...NO_RETRY,
		query: { ...bucketQuery(location), folder, cursor, all: all || undefined },
	});
