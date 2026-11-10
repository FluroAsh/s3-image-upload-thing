import type { Context } from "hono";

import type { PresignedUrlEntry, PresignedUrlError, PresignedUrlsResponse } from "~/shared/types";

import { generatePresignedUrl } from "../services/s3-operations";
import { bucketLocationOf } from "./params";
import { badRequest, respond } from "./respond";

/** Uses `Promise.allSettled` so keys that fail come back as `errors` beside the URLs that worked. */
export const presignedUrlsHandler = (ctx: Context) =>
	respond<PresignedUrlsResponse>(ctx, async () => {
		const { bucketName, bucketRegion } = bucketLocationOf(ctx);
		const body = await ctx.req.json<{ keys: string[] }>();

		if (!Array.isArray(body.keys) || body.keys.length === 0) throw badRequest("'keys' must be a non-empty array");

		const results = await Promise.allSettled(
			body.keys.map(async (key) => ({
				key,
				url: await generatePresignedUrl(bucketName, bucketRegion, key),
			})),
		);

		const urls: PresignedUrlEntry[] = [];
		const errors: PresignedUrlError[] = [];

		results.forEach((result, i) => {
			if (result.status === "fulfilled") {
				urls.push(result.value);
			} else {
				errors.push({
					key: body.keys[i],
					error: result.reason instanceof Error ? result.reason.message : "Failed to generate presigned URL",
				});
			}
		});

		return { urls, ...(errors.length > 0 && { errors }) };
	});
