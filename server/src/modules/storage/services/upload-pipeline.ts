import * as path from "node:path";

import sharp from "sharp";

import type { ImageVariants, ProcessedImage } from "@/shared/types/image";
import { errorMessage } from "@/shared/utils/helpers";
import type { BucketLocation, FileVariant, ImageVariant, UploadFileResult } from "~/shared/types";

import { ensureBuffer } from "../processors/variants/processor";
import { createImageVariants, prepareImages } from "./image-processing";
import {
	buildManifest,
	describeSource,
	hasRefusedUploadPrefix,
	placeholderDataUri,
	type SetIdentity,
	setKeyPrefix,
	sourceKey,
	uploadSetIdentity,
	variantKey,
} from "./manifest";
import { deleteObjects, imageSetExists, storeManifest, storeOriginal, uploadImages } from "./s3-operations";

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
	set: SetIdentity,
	location: BucketLocation,
): Promise<FileVariant[] | null> => {
	const body = ensureBuffer(image.source.buffer);
	/** A name without an extension would give a key the CDN's `original.*` deny rule does not match. */
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
		/** Only keys this upload targeted, and only once its create-only original proved the folder its own. */
		const sizeKeys = Object.keys(image.variations).map((variant) => variantKey(set, variant as ImageVariant));
		const left = await deleteObjects([source.key, ...sizeKeys], location);
		if (left.length === 0) throw error;
		throw new Error(`${errorMessage(error)}; could not delete ${left.join(", ")}, which were left behind`, {
			cause: error,
		});
	}
};

const exists = (name: string) => `An image set named "${name}" already exists`;

const refused = (file: string, reason: string): UploadFileResult => ({ file, status: "refused", reason });

const isImage = (body: Buffer) =>
	sharp(body)
		.metadata()
		.then(
			() => true,
			() => false,
		);

/** One file's whole upload, so a refusal or an error ends only this file and the rest of the batch carries on. */
const uploadFile = async (
	image: ProcessedImage,
	destination: string,
	location: BucketLocation,
): Promise<UploadFileResult> => {
	const file = image.fileName;
	try {
		const set = uploadSetIdentity(destination, file);
		const prefix = setKeyPrefix(set);
		if (hasRefusedUploadPrefix(prefix)) return refused(file, `Path "${prefix}" is reserved`);
		if (!(await isImage(ensureBuffer(image.buffer)))) return refused(file, "Not a valid image");
		if (await imageSetExists(set, location)) return refused(file, exists(set.name));

		const variants = await storeImageSet(await processImage(image), set, location);
		if (!variants) return refused(file, exists(set.name));
		return { file, status: "stored", variants };
	} catch (error) {
		console.error(error);
		return { file, status: "failed", reason: errorMessage(error) };
	}
};

export const runUploadPipeline = async (params: UploadPipelineParams): Promise<UploadFileResult[]> => {
	const { fileEntries, destination, ...location } = params;

	const preparedImages = await prepareImages(fileEntries);
	return Promise.all(preparedImages.map((image) => uploadFile(image, destination, location)));
};
