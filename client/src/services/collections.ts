import ofetch from "@/lib/ofetch";
import { NO_RETRY } from "@/services/s3";
import type {
	CollectionsFile,
	CreateCollectionRequest,
	CreateCollectionResponse,
	DeleteCollectionResponse,
	ReorderCollectionResponse,
	SetMembersRequest,
	SetMembersResponse,
	UpdateCollectionRequest,
	UpdateCollectionResponse,
	UpdatePhotoRequest,
	UpdatePhotoResponse,
} from "~/shared/types";

export type BucketLocation = { bucketName: string; bucketRegion: string };

export const scoped = ({ bucketName, bucketRegion }: BucketLocation) => ({ bucket: bucketName, region: bucketRegion });

export const getCollections = (location: BucketLocation): Promise<CollectionsFile> =>
	ofetch<CollectionsFile>("/storage/collections", { ...NO_RETRY, query: scoped(location) });

export const postCollection = (
	body: CreateCollectionRequest,
	location: BucketLocation,
): Promise<CreateCollectionResponse> =>
	ofetch<CreateCollectionResponse>("/storage/collections", { method: "POST", body, query: scoped(location) });

export const putSetMembers = (body: SetMembersRequest, location: BucketLocation): Promise<SetMembersResponse> =>
	ofetch<SetMembersResponse>("/storage/collections/members", { method: "PUT", body, query: scoped(location) });

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const patchPhoto = (
	set: string,
	body: UpdatePhotoRequest,
	location: BucketLocation,
): Promise<UpdatePhotoResponse> =>
	ofetch<UpdatePhotoResponse>(`/storage/collections/members/${set}`, {
		method: "PATCH",
		body,
		query: scoped(location),
	});

export const patchCollection = (
	{ slug, ...body }: { slug: string } & UpdateCollectionRequest,
	location: BucketLocation,
): Promise<UpdateCollectionResponse> =>
	ofetch<UpdateCollectionResponse>(`/storage/collections/${slug}`, { method: "PATCH", body, query: scoped(location) });

export const deleteCollection = (slug: string, location: BucketLocation): Promise<DeleteCollectionResponse> =>
	ofetch<DeleteCollectionResponse>(`/storage/collections/${slug}`, { method: "DELETE", query: scoped(location) });

export const putCollectionOrder = (
	{ slug, sets }: { slug: string; sets: string[] },
	location: BucketLocation,
): Promise<ReorderCollectionResponse> =>
	ofetch<ReorderCollectionResponse>(`/storage/collections/${slug}/order`, {
		method: "PUT",
		body: { sets },
		query: scoped(location),
	});
