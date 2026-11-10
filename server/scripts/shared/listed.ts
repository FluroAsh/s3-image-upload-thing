import type { SetIdentity } from "@/modules/storage/services/manifest";

export type BucketObject = {
	/** Bucket key of the object. */
	key: string;
	/** S3 ETag as listed, quotes included; only ever compared for equality. */
	etag: string;
};

export type ListedObject = BucketObject & {
	/** Size of the object in bytes, as listed. */
	bytes: number;
};

export const setLabel = ({ folder, name }: SetIdentity): string => `${folder ? `${folder}/` : ""}${name}`;
