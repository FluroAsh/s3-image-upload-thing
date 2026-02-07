import { BUCKETS_LIST_MAX, BUCKETS_PAGE_SIZE } from "@/shared/constants/s3";
import { WithS3Client } from "@/shared/middleware/with-s3-client";
import { ListBucketsCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { getBucketStats } from "../services/s3-operations";
import { transformBucket } from "@/shared/utils/transformers";
import { Context } from "hono";
import { readableSize } from "@/shared/utils/helpers";

export const listBucketsHandler = async (ctx: Context<WithS3Client>) => {
  const { s3Instance, region } = ctx.var;
  const limit = Math.min(
    Math.max(1, Number(ctx.req.query("limit")) || BUCKETS_PAGE_SIZE),
    100
  );
  const page = Math.max(1, Number(ctx.req.query("page")) || 1);

  try {
    const listCommand = new ListBucketsCommand({
      BucketRegion: region,
      MaxBuckets: BUCKETS_LIST_MAX,
    });

    const res = await s3Instance.send(listCommand);

    if (!res.Buckets?.length) {
      return ctx.json({ error: "No buckets found" }, 404);
    }

    const totalCount = res.Buckets.length;
    const totalPages = Math.ceil(totalCount / limit);
    const start = (page - 1) * limit;
    const bucketsForPage = res.Buckets.slice(start, start + limit);

    const bucketsWithStats = await Promise.all(
      bucketsForPage.map(async (bucket) => {
        const stats = bucket.Name
          ? await getBucketStats(s3Instance, bucket.Name)
          : undefined;
        return transformBucket(bucket, stats);
      })
    );

    const totalSizeBytes = bucketsWithStats.reduce(
      (sum, b) => sum + b.totalSizeBytes,
      0
    );

    const totalObjectCount = bucketsWithStats.reduce(
      (sum, b) => sum + b.objectCount,
      0
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
        `Error from S3 while listing buckets.  ${e.name}: ${e.message}`
      );
    } else {
      throw e;
    }
  }
};
