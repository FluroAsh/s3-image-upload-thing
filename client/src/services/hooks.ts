import ofetch from "@/lib/ofetch";
import { bucketQuery, NO_RETRY } from "@/services/s3";
import type {
	AddHookRequest,
	BucketLocation,
	DeleteHookResponse,
	DeployHook,
	DeployResponse,
	HookFired,
	HooksResponse,
	PinnedBucketResponse,
	UpdateHookRequest,
} from "~/shared/types";

export const getHooks = (location: BucketLocation): Promise<HooksResponse> =>
	ofetch<HooksResponse>("/settings/hooks", { ...NO_RETRY, query: bucketQuery(location) });

export const postDeploy = (location: BucketLocation): Promise<DeployResponse> =>
	ofetch<DeployResponse>("/settings/hooks/deploy", { method: "POST", query: bucketQuery(location) });

export const postHook = (body: AddHookRequest, location: BucketLocation): Promise<DeployHook> =>
	ofetch<DeployHook>("/settings/hooks", { method: "POST", body, query: bucketQuery(location) });

export const patchHook = (
	{ id, ...body }: { id: string } & UpdateHookRequest,
	location: BucketLocation,
): Promise<DeployHook> =>
	ofetch<DeployHook>(`/settings/hooks/${id}`, { method: "PATCH", body, query: bucketQuery(location) });

export const deleteHook = (id: string, location: BucketLocation): Promise<DeleteHookResponse> =>
	ofetch<DeleteHookResponse>(`/settings/hooks/${id}`, { method: "DELETE", query: bucketQuery(location) });

export const postTestHook = (id: string, location: BucketLocation): Promise<HookFired> =>
	ofetch<HookFired>(`/settings/hooks/${id}/test`, { method: "POST", query: bucketQuery(location) });

export const putPinnedBucket = (bucket: string | null): Promise<PinnedBucketResponse> =>
	ofetch<PinnedBucketResponse>("/settings/pinned-bucket", { method: "PUT", body: { bucket } });
