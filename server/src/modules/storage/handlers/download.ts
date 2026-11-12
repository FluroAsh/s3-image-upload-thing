import type { Context } from "hono";

import { downloadNameOf } from "../services/manifest";
import { generatePresignedUrl } from "../services/s3-operations";
import { bucketLocationOf } from "./params";
import { badRequest, respond } from "./respond";

export const downloadHandler = (ctx: Context) =>
	respond(ctx, async () => {
		const { bucketName, bucketRegion } = bucketLocationOf(ctx);
		const key = ctx.req.query("key");
		if (!key) throw badRequest("Missing 'key' query parameter");

		return ctx.redirect(await generatePresignedUrl(bucketName, bucketRegion, key, downloadNameOf(key)), 302);
	});
