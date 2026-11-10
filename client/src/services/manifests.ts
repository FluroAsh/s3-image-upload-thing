import ofetch from "@/lib/ofetch";
import { type BucketLocation, scoped } from "@/services/collections";
import { NO_RETRY } from "@/services/s3";
import type { Manifest } from "~/shared/types";

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const getManifest = (set: string, location: BucketLocation): Promise<Manifest> =>
	ofetch<Manifest>(`/storage/manifests/${set}`, { ...NO_RETRY, query: scoped(location) });
