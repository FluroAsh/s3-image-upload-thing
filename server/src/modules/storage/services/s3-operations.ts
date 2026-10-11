import {
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ImageVariants, VariantOutput } from "@/shared/types/image";
import type { BucketStats } from "@/shared/types/s3";
import { TIME } from "~/shared/constants/time";
import type { FileVariant, ImageVariant, Manifest } from "~/shared/types";

import { DEFAULT_FILE_TYPE, DEFAULT_MIME_TYPE } from "../processors/variants/config";
import { assertManifestKey, type ManifestLocation, manifestKey, setKeyPrefix } from "./manifest";

if (!process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
	throw new Error(
		"Jingle jingle, you're missing keys! Please ensure ACCESS_KEY_ID and SECRET_ACCESS_KEY are set in the environment variables.",
	);
}

// ---------------------------------------------------------------------------
// S3 clients
// - `s3Client` is a fixed-region client for account-level operations (ListBuckets).
// - Bucket-scoped operations (ListObjectsV2, GetObject, PutObject, presigned URLs)
//   must target the bucket's actual region. Use `getRegionalClient` to obtain a
//   lazily-created, cached client for a specific region.
//
// IMPORTANT: Do NOT enable `followRegionRedirects` on any shared S3Client instance.
// The SDK's `regionRedirectMiddleware` permanently mutates the client's internal
// region resolver after following a 301 redirect. When a single client is reused
// across requests that touch multiple regions (e.g. getBucketStats for buckets in
// us-east-1 and ap-southeast-2), the region flips on every redirect, causing
// subsequent account-level calls like ListBuckets to alternate between endpoints
// and return inconsistent metadata (e.g. different CreationDate values).
// ---------------------------------------------------------------------------

const createS3Client = (region: string) =>
	new S3Client({
		region,
		credentials: {
			accessKeyId: process.env.ACCESS_KEY_ID ?? "",
			secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
		},
	});

/** Region the server uses when none is given. */
export const defaultRegion = process.env.AWS_REGION ?? "us-east-1";

/** Fixed-region client for account-level operations that do not require a specific region (e.g. ListBuckets). */
export const s3Client = createS3Client(defaultRegion);

/** Lazily-created, region-specific clients for regional bucket-scoped operations. */
const regionalClientCache = new Map<string, S3Client>();

export const getRegionalClient = (region: string): S3Client => {
	let client = regionalClientCache.get(region);

	if (!client) {
		client = createS3Client(region);
		regionalClientCache.set(region, client);
	}

	return client;
};

export const getBucketStats = async (bucketName: string, bucketRegion: string): Promise<BucketStats> => {
	const stats: BucketStats = { objectCount: 0, totalSize: 0 };
	const client = getRegionalClient(bucketRegion);
	let continuationToken: string | undefined;

	try {
		do {
			const res = await client.send(
				new ListObjectsV2Command({
					Bucket: bucketName,
					ContinuationToken: continuationToken,
				}),
			);

			if (res.Contents) {
				for (const obj of res.Contents) {
					stats.objectCount += 1;
					stats.totalSize += obj.Size ?? 0;
				}
			}

			continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
		} while (continuationToken);
	} catch {
		return stats;
	}
	return stats;
};

export const generatePresignedUrl = async (
	bucketName: string,
	bucketRegion: string,
	key: string,
): Promise<`https://${string}`> => {
	const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
	const client = getRegionalClient(bucketRegion);

	/* @ts-expect-error - @smithy/smithy-client type is not compatible with the S3Client type */
	return (await getSignedUrl(client, command, {
		expiresIn: TIME.seconds.perHour,
	})) as `https://${string}`;
};

const publicCache = (seconds: number) => `public, max-age=${seconds}`;

// A day, not a year: keys carry no content hash, so a set deleted and re-uploaded under its name must not stay stale.
const VARIANT_CACHE_CONTROL = publicCache(TIME.seconds.perDay);

// Short, so a manifest replaced after its first read reaches clients within minutes.
const MANIFEST_CACHE_CONTROL = publicCache(5 * TIME.seconds.perMinute);

export type BucketLocation = {
	/** Name of the bucket to read or write. */
	bucketName: string;
	/** AWS region the bucket lives in; requests must be sent there. */
	bucketRegion: string;
};

export const uploadImages = async (
	image: ImageVariants,
	identity: ManifestLocation,
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<FileVariant[]> =>
	Promise.all(
		(Object.entries(image.variations) as [ImageVariant, VariantOutput][]).map(
			async ([variant, { buffer, size, width, height }]) => {
				const key = `${setKeyPrefix(identity)}${variant}_${identity.name}.${DEFAULT_FILE_TYPE}`;

				const putResponse = await getRegionalClient(bucketRegion).send(
					new PutObjectCommand({
						Body: buffer,
						Bucket: bucketName,
						Key: key,
						ContentType: DEFAULT_MIME_TYPE,
						CacheControl: VARIANT_CACHE_CONTROL,
					}),
				);

				if (!putResponse.ETag) throw new Error(`S3 returned no ETag for "${key}"`);

				const imageURL = await generatePresignedUrl(bucketName, bucketRegion, key);

				return {
					variant,
					fileName: image.fileName,
					key,
					imageURL,
					size,
					bytes: buffer.length,
					width,
					height,
					ETag: putResponse.ETag,
				} satisfies FileVariant;
			},
		),
	);

const isS3Error = (error: unknown, name: string): boolean => error instanceof Error && error.name === name;

/** Only "not found" means free; any other failure propagates, so a failed check never lets an upload through. */
const manifestExists = async (
	identity: ManifestLocation,
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<boolean> => {
	try {
		await getRegionalClient(bucketRegion).send(
			new HeadObjectCommand({ Bucket: bucketName, Key: manifestKey(identity) }),
		);
		return true;
	} catch (error) {
		if (isS3Error(error, "NotFound")) return false;
		throw error;
	}
};

/** A set with variants but no manifest (every set before the backfill) is still taken. */
export const imageSetExists = async (identity: ManifestLocation, location: BucketLocation): Promise<boolean> => {
	if (await manifestExists(identity, location)) return true;

	const { Contents } = await getRegionalClient(location.bucketRegion).send(
		new ListObjectsV2Command({ Bucket: location.bucketName, Prefix: setKeyPrefix(identity), MaxKeys: 1 }),
	);
	return (Contents?.length ?? 0) > 0;
};

export type StoreManifestOptions = {
	/** Replace a manifest that already exists instead of leaving it. */
	overwrite: boolean;
};

/** Stores a manifest under its derived key in the given bucket. Create-only unless told to overwrite: resolves `false`, storing nothing, when one exists. */
export const storeManifest = async (
	manifest: Manifest,
	{ bucketName, bucketRegion }: BucketLocation,
	{ overwrite }: StoreManifestOptions = { overwrite: false },
): Promise<boolean> => {
	const key = manifestKey(manifest);
	assertManifestKey(key);

	try {
		await getRegionalClient(bucketRegion).send(
			new PutObjectCommand({
				Body: JSON.stringify(manifest),
				Bucket: bucketName,
				Key: key,
				ContentType: "application/json",
				CacheControl: MANIFEST_CACHE_CONTROL,
				IfNoneMatch: overwrite ? undefined : "*",
			}),
		);
		return true;
	} catch (error) {
		if (isS3Error(error, "PreconditionFailed")) return false;
		throw error;
	}
};

export const readObject = async (key: string, { bucketName, bucketRegion }: BucketLocation): Promise<Buffer> => {
	const { Body } = await getRegionalClient(bucketRegion).send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
	if (!Body) throw new Error(`S3 returned no content for "${key}"`);

	return Buffer.from(await Body.transformToByteArray());
};

/** Reads the manifest stored for a set; `null` only when there is none, so a refused read is never taken for a free name. */
export const readManifest = async (
	identity: ManifestLocation,
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<Manifest | null> => {
	try {
		const { Body } = await getRegionalClient(bucketRegion).send(
			new GetObjectCommand({ Bucket: bucketName, Key: manifestKey(identity) }),
		);
		return Body ? JSON.parse(await Body.transformToString()) : null;
	} catch (error) {
		if (isS3Error(error, "NoSuchKey")) return null;
		throw error;
	}
};
