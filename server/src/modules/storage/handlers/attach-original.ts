import type { Context } from "hono";

import { ORIGINAL_FIELD } from "~/shared/constants/upload";
import type { GenerateSizesResponse } from "~/shared/types";

import { attachOriginal } from "../services/attach-original";
import { requestedManifest } from "./get-manifest";
import { bucketLocationOf } from "./params";
import { badRequest, respond } from "./respond";

export const attachOriginalHandler = (ctx: Context) =>
	respond<GenerateSizesResponse>(ctx, async () => {
		const location = bucketLocationOf(ctx);
		const file = (await ctx.req.parseBody())[ORIGINAL_FIELD];
		if (!(file instanceof File)) throw badRequest("No original provided");

		return { generated: await attachOriginal(await requestedManifest(ctx), file, location) };
	});
