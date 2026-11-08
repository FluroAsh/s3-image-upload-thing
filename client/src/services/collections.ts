import ofetch from "@/lib/ofetch";
import { NO_RETRY } from "@/services/s3";
import type {
	CollectionsFile,
	CreateCollectionRequest,
	CreateCollectionResponse,
	DeleteCollectionResponse,
	SetMembersRequest,
	SetMembersResponse,
	UpdateCollectionRequest,
	UpdateCollectionResponse,
	UpdatePhotoRequest,
	UpdatePhotoResponse,
} from "~/shared/types";

export const getCollections = (): Promise<CollectionsFile> => ofetch<CollectionsFile>("/storage/collections", NO_RETRY);

export const postCollection = (body: CreateCollectionRequest): Promise<CreateCollectionResponse> =>
	ofetch<CreateCollectionResponse>("/storage/collections", { method: "POST", body });

export const putSetMembers = (body: SetMembersRequest): Promise<SetMembersResponse> =>
	ofetch<SetMembersResponse>("/storage/collections/members", { method: "PUT", body });

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const patchPhoto = (set: string, body: UpdatePhotoRequest): Promise<UpdatePhotoResponse> =>
	ofetch<UpdatePhotoResponse>(`/storage/collections/members/${set}`, { method: "PATCH", body });

export const patchCollection = ({
	slug,
	...body
}: { slug: string } & UpdateCollectionRequest): Promise<UpdateCollectionResponse> =>
	ofetch<UpdateCollectionResponse>(`/storage/collections/${slug}`, { method: "PATCH", body });

export const deleteCollection = (slug: string): Promise<DeleteCollectionResponse> =>
	ofetch<DeleteCollectionResponse>(`/storage/collections/${slug}`, { method: "DELETE" });
