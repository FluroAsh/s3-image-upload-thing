import type { Context } from "hono";

import type { PresignedUrlEntry, PresignedUrlError } from "~/shared/types";

import { generatePresignedUrl } from "../services/s3-operations";

// NOTE: Not enforcing a hard limit yet, it doesn't make sense to limit this
// until we have better error handling in the browser
// const MAX_KEYS_LIMIT = 100;

/**
 * Generates presigned URLs for a batch of S3 object keys.
 * Uses `Promise.allSettled` to return partial results when individual keys fail.
 */
export const presignedUrlsHandler = async (ctx: Context) => {
	const bucketName = ctx.req.query("bucket");
	const bucketRegion = ctx.req.query("region");

	if (!bucketName || !bucketRegion) {
		return ctx.json({ error: "Missing expected parameters" }, 400);
	}

	const body = await ctx.req.json<{ keys: string[] }>();

	if (!Array.isArray(body.keys) || body.keys.length === 0) {
		return ctx.json({ error: "'keys' must be a non-empty array" }, 400);
	}

	// if (body.keys.length > MAX_KEYS_LIMIT) {
	//   return ctx.json(
	//     { error: `Maximum of ${MAX_KEYS_LIMIT} keys per request` },
	//     400,
	//   );
	// }

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

	return ctx.json({ urls, ...(errors.length > 0 && { errors }) });
};
