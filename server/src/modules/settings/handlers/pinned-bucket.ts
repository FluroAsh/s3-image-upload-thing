import type { Context } from "hono";

import { badRequest, readBody, respond } from "@/shared/utils/respond";
import type { PinnedBucketResponse, SetPinnedBucketRequest } from "~/shared/types";

import { updateSettings } from "../services/settings-store";

export const setPinnedBucketHandler = (ctx: Context) =>
	respond<PinnedBucketResponse>(ctx, async () => {
		const { bucket }: Partial<SetPinnedBucketRequest> = await readBody(ctx);
		if (bucket !== null && (typeof bucket !== "string" || !bucket.trim())) {
			throw badRequest("Bucket must be a bucket name or null");
		}
		return updateSettings((settings) => {
			if (bucket === null) delete settings.pinnedBucket;
			else settings.pinnedBucket = bucket.trim();
			return { pinnedBucket: settings.pinnedBucket };
		});
	});
