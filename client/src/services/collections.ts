import ofetch from "@/lib/ofetch";
import type {
	CollectionsFile,
	CreateCollectionRequest,
	CreateCollectionResponse,
	SetMembersRequest,
	SetMembersResponse,
	UpdatePhotoRequest,
	UpdatePhotoResponse,
} from "~/shared/types";

export const getCollections = (): Promise<CollectionsFile> => ofetch<CollectionsFile>("/storage/collections");

export const postCollection = (body: CreateCollectionRequest): Promise<CreateCollectionResponse> =>
	ofetch<CreateCollectionResponse>("/storage/collections", { method: "POST", body });

export const putSetMembers = (body: SetMembersRequest): Promise<SetMembersResponse> =>
	ofetch<SetMembersResponse>("/storage/collections/members", { method: "PUT", body });

/** `set` goes in the path as it is: the server's route takes the slashes of a set path. */
export const patchPhoto = (set: string, body: UpdatePhotoRequest): Promise<UpdatePhotoResponse> =>
	ofetch<UpdatePhotoResponse>(`/storage/collections/members/${set}`, { method: "PATCH", body });
