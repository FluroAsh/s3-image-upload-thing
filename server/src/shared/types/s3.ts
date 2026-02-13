import type { _Object } from "@aws-sdk/client-s3";

/** S3 object with a guaranteed Key (filtering out SDK's optional typing). */
export type ValidObject = _Object & { Key: string };

export type BucketStats = {
  objectCount: number;
  totalSize: number;
};
