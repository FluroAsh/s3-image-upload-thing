import { ListBucketsCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { Context } from "hono";

import { BUCKETS_LIST_MAX, BUCKETS_PAGE_SIZE } from "@/shared/constants/s3";
import { readableSize } from "@/shared/utils/helpers";
import { transformBucket } from "@/shared/utils/transformers";

import { getBucketStats, s3Client } from "../services/s3-operations";

export const listBucketsHandler = async (ctx: Context) => {
  const limit = Math.min(
    Math.max(1, Number(ctx.req.query("limit")) || BUCKETS_PAGE_SIZE),
    100,
  );
  const page = Math.max(1, Number(ctx.req.query("page")) || 1);

  try {
    const res = await s3Client.send(
      new ListBucketsCommand({
        MaxBuckets: BUCKETS_LIST_MAX,
      }),
    );

    if (!res.Buckets?.length) {
      return ctx.json({ error: "No buckets found" }, 404);
    }

    const totalCount = res.Buckets.length;
    const totalPages = Math.ceil(totalCount / limit);
    const start = (page - 1) * limit;
    const bucketsForPage = res.Buckets.slice(start, start + limit);

    const bucketsWithStats = await Promise.all(
      bucketsForPage.map(async (bucket) => {
        const stats =
          bucket.Name && bucket.BucketRegion
            ? await getBucketStats(bucket.Name, bucket.BucketRegion)
            : undefined;
        return transformBucket(bucket, stats);
      }),
    );

    const totalSizeBytes = bucketsWithStats.reduce(
      (sum, b) => sum + b.totalSizeBytes,
      0,
    );

    const totalObjectCount = bucketsWithStats.reduce(
      (sum, b) => sum + b.objectCount,
      0,
    );

    return ctx.json({
      buckets: bucketsWithStats,
      totalObjectCount,
      totalSizeBytes,
      totalSizeHuman: readableSize(totalSizeBytes),
      page,
      limit,
      totalCount,
      totalPages,
    });
  } catch (e) {
    if (e instanceof S3ServiceException) {
      console.error(
        `Error from S3 while listing buckets.  ${e.name}: ${e.message}`,
      );
    } else {
      throw e;
    }
  }
};
