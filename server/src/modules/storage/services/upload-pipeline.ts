import * as path from "node:path";

import sharp from "sharp";

import type { ImageVariants, ProcessedImage } from "@/shared/types/image";
import { errorMessage } from "@/shared/utils/helpers";
import type { FileVariant, ImageVariant } from "~/shared/types";

import { ensureBuffer } from "../processors/variants/processor";
import { createImageVariants, prepareImages } from "./image-processing";
import {
	buildManifest,
	describeSource,
	hasRefusedUploadPrefix,
	type NestedSetIdentity,
	placeholderDataUri,
	setKeyPrefix,
	sourceKey,
	uploadSetIdentity,
	variantKey,
} from "./manifest";
import {
	type BucketLocation,
	deleteObjects,
	imageSetExists,
	storeManifest,
	storeOriginal,
	uploadImages,
} from "./s3-operations";

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

/**
 * Stores the original first, so a size can always be remade from it, and the manifest only after every size, so a set exists if and only if its manifest does.
 * Resolves `null` when another upload took the name first.
 */
const storeImageSet = async (
	image: ImageVariants,
	set: NestedSetIdentity,
	location: BucketLocation,
): Promise<FileVariant[] | null> => {
	const body = ensureBuffer(image.source.buffer);
	// A name without an extension would give a key the CDN's `original.*` deny rule does not match.
	const extension = path.extname(image.fileName).slice(1) || (await sharp(body).metadata()).format;
	const source = await describeSource(sourceKey(set, extension), body);
	const { copyOriginalFrom } = image.source;
	const original = copyOriginalFrom
		? { key: source.key, copyFrom: copyOriginalFrom.key, ifMatch: copyOriginalFrom.etag }
		: { key: source.key, body, contentType: image.fileType };
	if (!(await storeOriginal(original, location))) return null;

	try {
		const stored = await uploadImages(image, set, location);
		const placeholderBuffer = image.variations.placeholder?.buffer;

		const manifest = buildManifest({
			createdAt: new Date().toISOString(),
			placeholder: placeholderBuffer ? placeholderDataUri(placeholderBuffer) : null,
			source,
			objects: stored.map(({ key, width, height, bytes, ETag }) => ({ key, width, height, bytes, etag: ETag })),
		});

		return (await storeManifest(manifest, location)) ? stored : null;
	} catch (error) {
		// Only keys this upload targeted, and only once its create-only original proved the folder its own.
		const sizeKeys = Object.keys(image.variations).map((variant) => variantKey(set, variant as ImageVariant));
		const left = await deleteObjects([source.key, ...sizeKeys], location);
		if (left.length === 0) throw error;
		throw new Error(`${errorMessage(error)}; could not delete ${left.join(", ")}, which were left behind`, {
			cause: error,
		});
	}
};

export const runUploadPipeline = async (params: UploadPipelineParams): Promise<UploadOutcome> => {
	const { fileEntries, destination, ...location } = params;

	const preparedImages = await prepareImages(fileEntries);
	const sets = preparedImages.map(({ fileName }) => uploadSetIdentity(destination, fileName));

	const reserved = sets.map(setKeyPrefix).filter(hasRefusedUploadPrefix);
	if (reserved.length > 0) return { refused: "reserved", names: reserved };

	const exists = await Promise.all(sets.map((set) => imageSetExists(set, location)));
	const taken = sets.filter((_, index) => exists[index]);
	if (taken.length > 0) return { refused: "exists", names: taken.map(({ name }) => name) };

	const processedImages = await Promise.all(preparedImages.map((image) => processImage(image)));
	const results = await Promise.all(processedImages.map((image, index) => storeImageSet(image, sets[index], location)));

	const lost = sets.filter((_, index) => results[index] === null);
	if (lost.length > 0) return { refused: "exists", names: lost.map(({ name }) => name) };

	return { files: results.flatMap((stored) => stored ?? []) };
};
