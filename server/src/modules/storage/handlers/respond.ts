import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { errorMessage } from "@/shared/utils/helpers";

import type { BucketLocation } from "../services/s3-operations";

export const badRequest = (message: string) => new HTTPException(400, { message });

/** The bucket and region a request names in its `bucket` and `region` query parameters. */
export const bucketOf = (ctx: Context): BucketLocation => {
	const bucketName = ctx.req.query("bucket");
	const bucketRegion = ctx.req.query("region");
	if (!bucketName || !bucketRegion) throw badRequest("Missing 'bucket' or 'region' query parameter");
	return { bucketName, bucketRegion };
};

/** Runs a handler body, answering an `HTTPException` with its own status and anything else as a logged 500. */
export const respond = async <Body>(ctx: Context, run: () => Promise<Body>, status: 200 | 201 = 200) => {
	try {
		return ctx.json(await run(), status);
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);

		console.error(error);
		return ctx.json({ error: errorMessage(error, "Request failed") }, 500);
	}
};
