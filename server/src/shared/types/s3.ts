import type { _Object } from "@aws-sdk/client-s3";

/** S3 object with a guaranteed Key (filtering out SDK's optional typing). */
export type ValidObject = _Object & { Key: string };

export type BucketStats = {
	/** Number of objects counted in the bucket. */
	objectCount: number;
	/** Sum of the counted objects' sizes in bytes. */
	totalSize: number;
	/** `true` when the listing stopped early, so both totals are lower bounds rather than the bucket's real size. */
	partial: boolean;
};
