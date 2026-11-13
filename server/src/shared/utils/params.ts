import type { Context } from "hono";

import type { BucketLocation } from "~/shared/types";

import { badRequest } from "./respond";

export const bucketLocationOf = (ctx: Context): BucketLocation => {
	const bucketName = ctx.req.query("bucket");
	const bucketRegion = ctx.req.query("region");
	if (!bucketName || !bucketRegion) throw badRequest("Missing 'bucket' or 'region' query parameter");
	return { bucketName, bucketRegion };
};
