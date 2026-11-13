import type { Context } from "hono";

import { bucketLocationOf } from "@/shared/utils/params";
import { badRequest, respond } from "@/shared/utils/respond";
import { ORIGINAL_FIELD } from "~/shared/constants/upload";
import type { GenerateSizesResponse } from "~/shared/types";

import { attachableSize, attachOriginal } from "../services/attach-original";
import { requestedManifest } from "./get-manifest";

export const attachOriginalHandler = (ctx: Context) =>
	respond<GenerateSizesResponse>(ctx, async () => {
		const location = bucketLocationOf(ctx);
		const manifest = await requestedManifest(ctx);
		const largest = attachableSize(manifest);
		const file = (await ctx.req.parseBody())[ORIGINAL_FIELD];
		if (!(file instanceof File)) throw badRequest("No original provided");

		return { generated: await attachOriginal(manifest, largest, file, location) };
	});
