import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as path from "node:path";
import type { FormatEnum } from "sharp";

import type { FileVariant } from "@shared/types";

import { TIME } from "@/shared/constants";
import type { ImageVariants } from "@/shared/types/image";
import type { BucketStats } from "@/shared/types/s3";

import { DEFAULT_FILE_TYPE } from "../processors/variants/config";

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
			accessKeyId: process.env.ACCESS_KEY_ID!,
			secretAccessKey: process.env.SECRET_ACCESS_KEY!,
		},
	});

const defaultRegion = process.env.AWS_REGION ?? "us-east-1";

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

// ---------------------------------------------------------------------------
// Bucket stats
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Presigned URLs
// ---------------------------------------------------------------------------

export const generatePresignedUrl = async (bucketName: string, bucketRegion: string, key: string): Promise<string> => {
	const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
	const client = getRegionalClient(bucketRegion);

	return getSignedUrl(client, command, {
		expiresIn: TIME.ONE_HOUR_IN_SECONDS,
	});
};

export const uploadImages = async (
	image: ImageVariants,
	options: {
		destination: string;
		format: keyof FormatEnum;
		bucketName: string;
		bucketRegion: string;
	},
): Promise<FileVariant[]> => {
	const { fileName } = image;
	const { format, bucketRegion, bucketName, destination } = options;
	const baseName = path.parse(fileName).name;
	const formatExt = format ?? DEFAULT_FILE_TYPE;

	return Promise.all(
		Object.entries(image.variations).map(async ([variant, { buffer, size }]) => {
			const fileNameKey = `${variant}_${baseName}.${formatExt}`;
			const key = destination ? `${destination}/${baseName}/${fileNameKey}` : `${baseName}/${fileNameKey}`;

			const putResponse = await getRegionalClient(bucketRegion).send(
				new PutObjectCommand({
					Body: buffer,
					Bucket: bucketName,
					Key: key,
					ContentType: "image/webp",
				}),
			);

			const imageURL = await generatePresignedUrl(bucketName, bucketRegion, key);

			return {
				variant,
				fileName: image.fileName,
				imageURL,
				size,
				ETag: putResponse.ETag,
			} as FileVariant;
		}),
	);
};
