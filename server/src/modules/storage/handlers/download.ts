import type { Context } from "hono";

import { generatePresignedUrl } from "../services/s3-operations";
import { bucketLocationOf } from "./params";
import { badRequest, respond } from "./respond";

/** Redirects to a URL that makes the browser save the file: the bucket sends no CORS headers, so the client cannot fetch and save it itself. */
export const downloadHandler = async (ctx: Context) => {
	let url: string | undefined;
	const failure = await respond(ctx, async () => {
		const { bucketName, bucketRegion } = bucketLocationOf(ctx);
		const key = ctx.req.query("key");
		if (!key) throw badRequest("Missing 'key' query parameter");

		url = await generatePresignedUrl(bucketName, bucketRegion, key, key.split("/").pop());
		return {};
	});
	return url ? ctx.redirect(url, 302) : failure;
};
