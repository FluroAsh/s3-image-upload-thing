import type { ImageVariants, ProcessedImage } from "@/shared/types/image";
import type { FileVariant } from "~/shared/types";

import { DEFAULT_MIME_TYPE } from "../processors/variants/config";
import { createImageVariants, prepareImages } from "./image-processing";
import {
	buildManifest,
	hasRefusedUploadPrefix,
	type ManifestLocation,
	setKeyPrefix,
	uploadSetIdentity,
} from "./manifest";
import { type BucketLocation, imageSetExists, storeManifest, uploadImages } from "./s3-operations";

/** Why an upload was turned away: `reserved` for a path the service owns, `exists` for a name already taken. */
export const UPLOAD_REFUSALS = ["reserved", "exists"] as const;

export type UploadRefusal = (typeof UPLOAD_REFUSALS)[number];

export type UploadOutcome =
	| {
			/** Every variant stored, across all sets of the request. */
			files: FileVariant[];
	  }
	| {
			/** Why nothing was stored, or why the last set could not be completed. */
			refused: UploadRefusal;
			/** The key prefixes (`reserved`) or set names (`exists`) that caused it. */
			names: string[];
	  };

export type UploadPipelineParams = BucketLocation & {
	/** Multipart entries of the request, as field name and value; non-file values are ignored. */
	fileEntries: [string, string | File][];
	/** Folder each image set's own folder is created in; `""` for the bucket root. */
	destination: string;
};

const processImage = async (sourceImage: ProcessedImage): Promise<ImageVariants> => {
	const { fieldName, fileName, fileType, size } = sourceImage;
	const variations = await createImageVariants(sourceImage);

	/**
	 * TODO:
	 * - Generate AVIF formats (HDR) and save to bucket as an additional format when "withHDR" param is true
	 * - This requires a separate image processing step before uploading to S3
	 *   see: https://sharp.pixelplumbing.com/api-output/#avif
	 */

	return {
		fieldName,
		fileName,
		fileType,
		size,
		source: sourceImage,
		variations,
	};
};

/** Stores the manifest only after every variant, so a set exists if and only if its manifest does. Resolves `null` when another upload took the name first. */
const storeImageSet = async (
	image: ImageVariants,
	identity: ManifestLocation,
	location: BucketLocation,
): Promise<FileVariant[] | null> => {
	const stored = await uploadImages(image, identity, location);
	const placeholderBuffer = image.variations.placeholder?.buffer;

	const manifest = buildManifest({
		bucket: location.bucketName,
		pathPrefix: identity.pathPrefix,
		createdAt: new Date().toISOString(),
		placeholder: placeholderBuffer ? `data:${DEFAULT_MIME_TYPE};base64,${placeholderBuffer.toString("base64")}` : null,
		source: null,
		objects: stored.map(({ key, width, height, bytes, ETag }) => ({ key, width, height, bytes, etag: ETag })),
	});

	return (await storeManifest(manifest, location)) ? stored : null;
};

export const runUploadPipeline = async (params: UploadPipelineParams): Promise<UploadOutcome> => {
	const { fileEntries, destination, ...location } = params;

	const preparedImages = await prepareImages(fileEntries);
	const identities = preparedImages.map(({ fileName }) => uploadSetIdentity(destination, fileName));

	const reserved = identities.map(setKeyPrefix).filter(hasRefusedUploadPrefix);
	if (reserved.length > 0) return { refused: "reserved", names: reserved };

	const exists = await Promise.all(identities.map((identity) => imageSetExists(identity, location)));
	const taken = identities.filter((_, index) => exists[index]);
	if (taken.length > 0) return { refused: "exists", names: taken.map(({ name }) => name) };

	const processedImages = await Promise.all(preparedImages.map((image) => processImage(image)));
	const results = await Promise.all(
		processedImages.map((image, index) => storeImageSet(image, identities[index], location)),
	);

	const lost = identities.filter((_, index) => results[index] === null);
	if (lost.length > 0) return { refused: "exists", names: lost.map(({ name }) => name) };

	return { files: results.flatMap((stored) => stored ?? []) };
};
