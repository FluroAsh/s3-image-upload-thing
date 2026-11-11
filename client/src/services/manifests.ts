import ofetch from "@/lib/ofetch";
import { bucketQuery, NO_RETRY } from "@/services/s3";
import type { BucketLocation, GenerateSizesResponse, Manifest } from "~/shared/types";

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const getManifest = (set: string, location: BucketLocation): Promise<Manifest> =>
	ofetch<Manifest>(`/storage/manifests/${set}`, { ...NO_RETRY, query: bucketQuery(location) });

export const postGenerateSizes = (set: string, location: BucketLocation): Promise<GenerateSizesResponse> =>
	ofetch<GenerateSizesResponse>(`/storage/sizes/${set}`, { method: "POST", ...NO_RETRY, query: bucketQuery(location) });
