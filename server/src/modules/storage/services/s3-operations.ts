import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ImageVariants, VariantOutput } from "@/shared/types/image";
import type { BucketStats } from "@/shared/types/s3";
import { TIME } from "~/shared/constants/time";
import type { FileVariant, ImageVariant, Manifest } from "~/shared/types";

import { DEFAULT_FILE_TYPE, DEFAULT_MIME_TYPE } from "../processors/variants/config";
import {
	assertManifestKey,
	isManifest,
	manifestKey,
	type NestedSetIdentity,
	NotAManifestError,
	setKeyPrefix,
} from "./manifest";

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
	set: NestedSetIdentity,
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<FileVariant[]> =>
	Promise.all(
		(Object.entries(image.variations) as [ImageVariant, VariantOutput][]).map(
			async ([variant, { buffer, size, width, height }]) => {
				const key = `${setKeyPrefix(set)}${variant}_${set.name}.${DEFAULT_FILE_TYPE}`;

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

/** Anything under the set's folder takes the name, a manifest or not. A failed listing propagates, so it never lets an upload through. */
export const imageSetExists = async (set: NestedSetIdentity, location: BucketLocation): Promise<boolean> => {
	const { Contents } = await getRegionalClient(location.bucketRegion).send(
		new ListObjectsV2Command({ Bucket: location.bucketName, Prefix: setKeyPrefix(set), MaxKeys: 1 }),
	);
	return (Contents?.length ?? 0) > 0;
};

export type StoreManifestOptions = {
	/** Replace a manifest already stored at the key; without it, an existing one is left and the store resolves `false`. */
	force: boolean;
};

/** Long enough for a full-size original on a slow link, short enough that a stalled connection fails its set rather than hanging the run. */
const REQUEST_TIMEOUT_MS = 60_000;

/** Gives one request, body included, a fresh deadline. The abort signal alone does not stop a body that stalls mid-read, and the SDK's abort error does not say why it stopped. */
export const withDeadline = async <Result>(
	request: (options: { abortSignal: AbortSignal }) => Promise<Result>,
): Promise<Result> => {
	const abortSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
	const timedOut = new Error(`S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
	let onAbort = () => {};
	const deadline = new Promise<never>((_, reject) => {
		onAbort = () => reject(timedOut);
		abortSignal.addEventListener("abort", onAbort, { once: true });
	});

	try {
		return await Promise.race([request({ abortSignal }), deadline]);
	} catch (error) {
		throw abortSignal.aborted ? timedOut : error;
	} finally {
		abortSignal.removeEventListener("abort", onAbort);
	}
};

/** Resolves `false`, storing nothing, when a manifest exists and `force` is off, so "already there" is not mistaken for a failure. */
export const storeManifest = async (
	manifest: Manifest,
	{ bucketName, bucketRegion }: BucketLocation,
	{ force }: StoreManifestOptions = { force: false },
): Promise<boolean> => {
	const key = manifestKey(manifest);
	assertManifestKey(key);

	try {
		await withDeadline((options) =>
			getRegionalClient(bucketRegion).send(
				new PutObjectCommand({
					Body: JSON.stringify(manifest),
					Bucket: bucketName,
					Key: key,
					ContentType: "application/json",
					CacheControl: MANIFEST_CACHE_CONTROL,
					IfNoneMatch: force ? undefined : "*",
				}),
				options,
			),
		);
		return true;
	} catch (error) {
		if (isS3Error(error, "PreconditionFailed")) return false;
		throw error;
	}
};

export const readObject = (key: string, { bucketName, bucketRegion }: BucketLocation): Promise<Buffer> =>
	withDeadline(async (options) => {
		const { Body } = await getRegionalClient(bucketRegion).send(
			new GetObjectCommand({ Bucket: bucketName, Key: key }),
			options,
		);
		if (!Body) throw new Error(`S3 returned no content for "${key}"`);

		return Buffer.from(await Body.transformToByteArray());
	});

/** Reads the manifest stored for a set; `null` only when there is none, so a refused read is never taken for a free name. Throws `NotAManifestError` for any other file at the key. */
export const readManifest = async (set: NestedSetIdentity, location: BucketLocation): Promise<Manifest | null> => {
	const key = manifestKey(set);
	let stored: unknown;

	try {
		stored = JSON.parse((await readObject(key, location)).toString("utf8"));
	} catch (error) {
		if (isS3Error(error, "NoSuchKey")) return null;
		if (error instanceof SyntaxError) throw new NotAManifestError(key);
		throw error;
	}

	if (!isManifest(stored)) throw new NotAManifestError(key);
	return stored;
};
