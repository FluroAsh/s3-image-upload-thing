import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListBucketsCommand,
	ListObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	type ServiceInputTypes,
	type ServiceOutputTypes,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SmithyResolvedConfiguration } from "@smithy/smithy-client";
import type { Command, HttpHandlerOptions } from "@smithy/types";

import { BUCKETS_LIST_MAX } from "@/shared/constants/s3";
import type { ImageVariants, VariantOutput } from "@/shared/types/image";
import type { BucketStats } from "@/shared/types/s3";
import { errorMessage } from "@/shared/utils/helpers";
import { TIME } from "~/shared/constants/time";
import type { FileVariant, ImageVariant, Manifest } from "~/shared/types";

import { DEFAULT_MIME_TYPE } from "../processors/variants/config";
import {
	assertManifestKey,
	isManifest,
	manifestKey,
	type NestedSetIdentity,
	NotAManifestError,
	setKeyPrefix,
	variantKey,
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
const s3Client = createS3Client(defaultRegion);

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

export const listBuckets = () => sendWithDeadline(s3Client, new ListBucketsCommand({ MaxBuckets: BUCKETS_LIST_MAX }));

export const getBucketStats = async (bucketName: string, bucketRegion: string): Promise<BucketStats> => {
	const stats: BucketStats = { objectCount: 0, totalSize: 0, partial: false };
	const client = getRegionalClient(bucketRegion);
	let continuationToken: string | undefined;

	try {
		do {
			const res = await sendWithDeadline(
				client,
				new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken: continuationToken }),
			);

			for (const obj of res.Contents ?? []) {
				stats.objectCount += 1;
				stats.totalSize += obj.Size ?? 0;
			}

			continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
		} while (continuationToken);
	} catch (error) {
		console.error(`Bucket stats for "${bucketName}" stopped early: ${errorMessage(error)}`);
		stats.partial = true;
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
): Promise<FileVariant[]> => {
	const settled = await Promise.allSettled(
		(Object.entries(image.variations) as [ImageVariant, VariantOutput][]).map(
			async ([variant, { buffer, size, width, height }]) => {
				const key = variantKey(set, variant);

				const putResponse = await sendWithDeadline(
					getRegionalClient(bucketRegion),
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

	// Waits for every write's deadline, not the write itself: a timed-out request may still be open when clean-up starts.
	const failure = settled.find((result) => result.status === "rejected");
	if (failure) throw failure.reason;
	return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
};

/** Deletes each key, none skipped because another failed; resolves the keys that could not be deleted. A key that is already gone counts as deleted. */
export const deleteObjects = async (
	keys: readonly string[],
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<string[]> => {
	const settled = await Promise.allSettled(
		keys.map((key) =>
			sendWithDeadline(getRegionalClient(bucketRegion), new DeleteObjectCommand({ Bucket: bucketName, Key: key })),
		),
	);
	return keys.filter((_, index) => settled[index].status === "rejected");
};

const isS3Error = (error: unknown, name: string): boolean => error instanceof Error && error.name === name;

export const listObjects = ({ bucketName, bucketRegion }: BucketLocation) =>
	sendWithDeadline(getRegionalClient(bucketRegion), new ListObjectsCommand({ Bucket: bucketName }));

/** Anything under the set's folder takes the name, a manifest or not. A failed listing propagates, so it never lets an upload through. */
export const imageSetExists = async (set: NestedSetIdentity, location: BucketLocation): Promise<boolean> => {
	const { Contents } = await sendWithDeadline(
		getRegionalClient(location.bucketRegion),
		new ListObjectsV2Command({ Bucket: location.bucketName, Prefix: setKeyPrefix(set), MaxKeys: 1 }),
	);
	return (Contents?.length ?? 0) > 0;
};

export type StoreManifestOptions = {
	/** Replace a manifest already stored at the key; without it, an existing one is left and the store resolves `false`. */
	force: boolean;
};

/** Long enough for a full-size original on a slow link, short enough that a stalled connection fails its set rather than hanging the run. */
export const REQUEST_TIMEOUT_MS = 60_000;

/** Gives one request, body included, a fresh deadline. The abort signal alone does not stop a body that stalls mid-read, and the SDK's abort error does not say why it stopped. */
export const withDeadline = async <Result>(
	request: (options: { abortSignal: AbortSignal }) => Promise<Result>,
): Promise<Result> => {
	const controller = new AbortController();
	const timedOut = new Error(`S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Not `AbortSignal.timeout`: Bun exits 0 when nothing keeps the event loop alive, and that timer does not, so a stalled request ended the run silently.
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort(timedOut);
			reject(timedOut);
		}, REQUEST_TIMEOUT_MS);
	});

	try {
		return await Promise.race([request({ abortSignal: controller.signal }), deadline]);
	} catch (error) {
		throw controller.signal.aborted ? timedOut : error;
	} finally {
		clearTimeout(timer);
	}
};

/** `client.send` under `withDeadline`, with the output typed as the SDK types it. */
const sendWithDeadline = <Input extends ServiceInputTypes, Output extends ServiceOutputTypes>(
	client: S3Client,
	command: Command<
		ServiceInputTypes,
		Input,
		ServiceOutputTypes,
		Output,
		SmithyResolvedConfiguration<HttpHandlerOptions>
	>,
) => withDeadline((options) => client.send(command, options));

/** Resolves `false` when a create-only write found the key taken, so "already there" is not mistaken for a failure. */
const unlessTaken = async (write: Promise<unknown>): Promise<boolean> => {
	try {
		await write;
		return true;
	} catch (error) {
		if (isS3Error(error, "PreconditionFailed")) return false;
		throw error;
	}
};

/** Resolves `false`, storing nothing, when a manifest exists and `force` is off. */
export const storeManifest = async (
	manifest: Manifest,
	{ bucketName, bucketRegion }: BucketLocation,
	{ force }: StoreManifestOptions = { force: false },
): Promise<boolean> => {
	const key = manifestKey(manifest);
	assertManifestKey(key);

	return unlessTaken(
		sendWithDeadline(
			getRegionalClient(bucketRegion),
			new PutObjectCommand({
				Body: JSON.stringify(manifest),
				Bucket: bucketName,
				Key: key,
				ContentType: "application/json",
				CacheControl: MANIFEST_CACHE_CONTROL,
				IfNoneMatch: force ? undefined : "*",
			}),
		),
	);
};

export type StoreOriginalParams = {
	/** Key the original is stored under, from `sourceKey`. */
	key: string;
} & (
	| {
			/** The uploaded file's bytes, stored as they are. */
			body: Buffer;
			/** MIME type the client sent for the upload. */
			contentType: string;
	  }
	| {
			/** Key of an object in the same bucket that already holds the original, copied server side instead of uploading it again. */
			copyFrom: string;
			/** ETag of the exact object that was read, so the copy fails rather than keep bytes that differ from the ones measured. */
			ifMatch: string;
	  }
);

/** Create-only, like a manifest, so an upload racing for the same name can never replace it; resolves `false` when one exists. */
export const storeOriginal = async (
	params: StoreOriginalParams,
	{ bucketName, bucketRegion }: BucketLocation,
): Promise<boolean> => {
	const { key } = params;
	const client = getRegionalClient(bucketRegion);

	if (!("copyFrom" in params)) {
		const { body, contentType } = params;
		return unlessTaken(
			sendWithDeadline(
				client,
				new PutObjectCommand({ Body: body, Bucket: bucketName, Key: key, ContentType: contentType, IfNoneMatch: "*" }),
			),
		);
	}

	const CopySource = `${bucketName}/${params.copyFrom.split("/").map(encodeURIComponent).join("/")}`;
	try {
		await sendWithDeadline(
			client,
			new CopyObjectCommand({
				Bucket: bucketName,
				Key: key,
				CopySource,
				CopySourceIfMatch: params.ifMatch,
				IfNoneMatch: "*",
			}),
		);
		return true;
	} catch (error) {
		if (!isS3Error(error, "PreconditionFailed")) throw error;
		// S3 answers a changed source and a taken destination the same way, so only the destination tells them apart.
		const { Contents } = await sendWithDeadline(
			client,
			new ListObjectsV2Command({ Bucket: bucketName, Prefix: key, MaxKeys: 1 }),
		);
		if (Contents?.some((object) => object.Key === key)) return false;
		throw new Error(`"${params.copyFrom}" changed after it was read, so it was not copied`);
	}
};

const fetchObject = (key: string, { bucketName, bucketRegion }: BucketLocation) =>
	withDeadline(async (options) => {
		const { Body, ETag } = await getRegionalClient(bucketRegion).send(
			new GetObjectCommand({ Bucket: bucketName, Key: key }),
			options,
		);
		if (!Body) throw new Error(`S3 returned no content for "${key}"`);

		return { body: Buffer.from(await Body.transformToByteArray()), etag: ETag };
	});

export const readObject = async (key: string, location: BucketLocation): Promise<Buffer> =>
	(await fetchObject(key, location)).body;

/** Like `readObject`, with the ETag of the exact version that was read. */
export const getObject = async (key: string, location: BucketLocation): Promise<{ body: Buffer; etag: string }> => {
	const { body, etag } = await fetchObject(key, location);
	if (!etag) throw new Error(`S3 returned no ETag for "${key}"`);
	return { body, etag };
};

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
