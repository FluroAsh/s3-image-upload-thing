import { type Bucket as AwsBucket } from "@aws-sdk/client-s3";
import { format } from "date-fns";

import type { Bucket } from "@shared/types";

import type { BucketStats } from "@/shared/types/s3";

import { readableSize } from "./helpers";

/** Transform an AWS S3 bucket object into a normalized Bucket type, for consumption in the client application. */
export const transformBucket = (
  bucket: AwsBucket,
  stats?: BucketStats,
): Bucket => {
  const formattedCreationDate = bucket.CreationDate
    ? format(bucket.CreationDate, "do LLLL, yyyy")
    : "";

  return {
    Name: bucket.Name ?? "",
    CreationDate: bucket.CreationDate?.toISOString() ?? "",
    formattedCreationDate,
    BucketRegion: bucket.BucketRegion ?? "",
    objectCount: stats?.objectCount ?? 0,
    totalSizeBytes: stats?.totalSize ?? 0,
    totalSizeHuman: readableSize(stats?.totalSize ?? 0),
  };
};
