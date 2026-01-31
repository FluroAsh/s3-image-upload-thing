import { type Bucket } from "@aws-sdk/client-s3";
import { format } from "date-fns";
import type { BucketStats } from "@/features/s3/service";

export const transformBucket = (bucket: Bucket, stats?: BucketStats) => {
  const formattedCreationDate = bucket.CreationDate
    ? format(bucket.CreationDate, "do LLLL, yyyy")
    : "";

  return {
    Name: bucket.Name,
    CreationDate: bucket.CreationDate,
    formattedCreationDate,
    BucketRegion: bucket.BucketRegion,
    objectCount: stats?.objectCount ?? 0,
    totalSize: stats?.totalSize ?? 0,
  };
};
