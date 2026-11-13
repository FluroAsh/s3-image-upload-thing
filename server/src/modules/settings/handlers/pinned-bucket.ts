import type { Context } from "hono";

import { badRequest, respond } from "@/shared/utils/respond";
import type { PinnedBucketResponse, SetPinnedBucketRequest } from "~/shared/types";

import { updateSettings } from "../services/settings-store";

export const setPinnedBucketHandler = (ctx: Context) =>
	respond<PinnedBucketResponse>(ctx, async () => {
		const body: Partial<SetPinnedBucketRequest> | null = await ctx.req.json().catch(() => null);
		const bucket = body?.bucket;
		if (bucket !== null && (typeof bucket !== "string" || !bucket.trim())) {
			throw badRequest("Bucket must be a bucket name or null");
		}
		return updateSettings((settings) => {
			if (bucket === null) delete settings.pinnedBucket;
			else settings.pinnedBucket = bucket;
			return { pinnedBucket: settings.pinnedBucket };
		});
	});
