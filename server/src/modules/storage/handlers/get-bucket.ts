import type { Context } from "hono";

import { errorMessage } from "@/shared/utils/helpers";

import { constructFileTree } from "../services/file-tree";
import { listObjects } from "../services/s3-operations";

export const getBucketHandler = async (ctx: Context) => {
	const bucketName = ctx.req.param("bucketName");
	const bucketRegion = ctx.req.query("region");

	if (!bucketRegion) {
		return ctx.json({ error: "Missing required 'region' query parameter" }, 400);
	}

	try {
		const listResponse = await listObjects({ bucketName, bucketRegion });

		return ctx.json({ tree: constructFileTree({ objects: listResponse.Contents ?? [] }) });
	} catch (e) {
		console.error(e);
		return ctx.json({ error: errorMessage(e, "Failed to get bucket") }, 500);
	}
};
