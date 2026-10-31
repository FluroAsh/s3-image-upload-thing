import { type BucketLocation, defaultRegion } from "@/modules/storage/services/s3-operations";

/** Options every bucket script takes, for `parseArgs`. */
export const BUCKET_OPTIONS = {
	bucket: { type: "string" },
	prefix: { type: "string" },
	region: { type: "string" },
	write: { type: "boolean", default: false },
} as const;

export type BucketArgs = {
	/** Bucket the run reads and, with `write`, writes, in its region (the server default when none is given). */
	location: BucketLocation;
	/** Folder of the bucket the run is limited to, without a slash at either end; unset for the whole bucket. */
	folder: string | undefined;
	/** Store objects; `false` is a dry run, which stores nothing. */
	write: boolean;
};

type BucketValues = Partial<Pick<BucketArgs, "write">> & {
	/** The `--bucket` value as typed. */
	bucket?: string;
	/** The `--region` value as typed. */
	region?: string;
	/** The `--prefix` value as typed. */
	prefix?: string;
};

/** Throws `problem` followed by the script's usage text. */
export const usageError =
	(usage: string) =>
	(problem: string): never => {
		throw new Error(`${problem}\n\n${usage}`);
	};

export const readBucketArgs = (values: BucketValues, fail: (problem: string) => never): BucketArgs => {
	const { bucket, region, write = false } = values;
	const folder = values.prefix?.replace(/\/+$/, "");

	if (!bucket) return fail("--bucket is required");
	// Keys never start with "/", so such a filter lists nothing and the run would look like a clean one.
	if (folder === "" || folder?.startsWith("/")) {
		fail('--prefix must name a folder without a leading "/", e.g. japan-2025; omit it to run the whole bucket');
	}

	return { location: { bucketName: bucket, bucketRegion: region ?? defaultRegion }, folder, write };
};
