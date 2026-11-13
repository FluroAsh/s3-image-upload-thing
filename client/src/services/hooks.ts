import ofetch from "@/lib/ofetch";
import { bucketQuery, NO_RETRY } from "@/services/s3";
import type { BucketLocation, DeployResponse, HooksResponse } from "~/shared/types";

export const getHooks = (location: BucketLocation): Promise<HooksResponse> =>
	ofetch<HooksResponse>("/settings/hooks", { ...NO_RETRY, query: bucketQuery(location) });

export const postDeploy = (location: BucketLocation): Promise<DeployResponse> =>
	ofetch<DeployResponse>("/settings/hooks/deploy", { method: "POST", query: bucketQuery(location) });
