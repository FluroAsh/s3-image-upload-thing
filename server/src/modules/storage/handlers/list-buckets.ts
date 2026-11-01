import type { Context } from "hono";

import { BUCKETS_PAGE_SIZE } from "@/shared/constants/s3";
import { errorMessage, readableSize } from "@/shared/utils/helpers";
import { transformBucket } from "@/shared/utils/transformers";
import type { BucketsResponse } from "~/shared/types";

import { getBucketStats, listBuckets } from "../services/s3-operations";

export const listBucketsHandler = async (ctx: Context) => {
	const limit = Math.min(Math.max(1, Number(ctx.req.query("limit")) || BUCKETS_PAGE_SIZE), 100);
	const page = Math.max(1, Number(ctx.req.query("page")) || 1);

	try {
		const res = await listBuckets();

		const buckets = res.Buckets ?? [];
		const totalCount = buckets.length;
		const totalPages = Math.ceil(totalCount / limit);
		const start = (page - 1) * limit;
		const bucketsForPage = buckets.slice(start, start + limit);

		const bucketsWithStats = await Promise.all(
			bucketsForPage.map(async (bucket) => {
				const stats =
					bucket.Name && bucket.BucketRegion ? await getBucketStats(bucket.Name, bucket.BucketRegion) : undefined;
				return transformBucket(bucket, stats);
			}),
		);

		const totalSizeBytes = bucketsWithStats.reduce((sum, b) => sum + b.totalSizeBytes, 0);
		const totalObjectCount = bucketsWithStats.reduce((sum, b) => sum + b.objectCount, 0);

		return ctx.json({
			buckets: bucketsWithStats,
			totalObjectCount,
			totalSizeBytes,
			totalSizeHuman: readableSize(totalSizeBytes),
			partial: bucketsWithStats.some((b) => b.partial),
			page,
			limit,
			totalCount,
			totalPages,
		} satisfies BucketsResponse);
	} catch (e) {
		console.error(e);
		return ctx.json({ error: errorMessage(e, "Failed to list buckets") }, 500);
	}
};
