import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

import type { BucketLocation, ImageVariant, Manifest, ManifestVariant } from "~/shared/types";

import { generateMissingSizes } from "./generate-sizes";
import { describeSource, originalContentType, originalExtension, sourceKey } from "./manifest";
import { deleteObjects, storeManifest, storeOriginal } from "./s3-operations";

type Size = Pick<ManifestVariant, "width" | "height">;

/** Allows a pixel of rounding on the other edge, which is what resizing a size to whole pixels can cost. */
const sameAspect = (upload: Size, variant: Size): boolean =>
	Math.abs((upload.height * variant.width) / upload.width - variant.height) <= 1;

/** The refusals that need only the manifest, so a handler can make them before it buffers the upload; resolves the largest size. */
export const attachableSize = (manifest: Manifest): ManifestVariant => {
	if (manifest.source) throw new HTTPException(409, { message: "This set already keeps an original" });
	const largest = Object.values(manifest.variants).sort((a, b) => b.width * b.height - a.width * a.height)[0];
	if (!largest) throw new HTTPException(409, { message: "This set has no size to compare an original against" });
	return largest;
};

/** No hash was stored, so aspect is the only proof it is the same image; the source is recorded before the sizes so a failed size run can be finished by Generate. */
export const attachOriginal = async (
	manifest: Manifest,
	largest: ManifestVariant,
	file: File,
	location: BucketLocation,
): Promise<ImageVariant[]> => {
	const body = Buffer.from(await file.arrayBuffer());
	const metadata = await sharp(body)
		.metadata()
		.catch(() => {
			throw new HTTPException(422, { message: "Not a valid image" });
		});
	const { autoOrient } = metadata;
	if (!sameAspect(autoOrient, largest)) {
		throw new HTTPException(422, {
			message: `The image is ${autoOrient.width}×${autoOrient.height}, which does not match this set's ${largest.width}×${largest.height}`,
		});
	}
	if (autoOrient.width < largest.width || autoOrient.height < largest.height) {
		throw new HTTPException(422, {
			message: `The image is ${autoOrient.width}×${autoOrient.height}, smaller than this set's largest size (${largest.width}×${largest.height})`,
		});
	}

	const source = describeSource(sourceKey(manifest, originalExtension(metadata)), body, metadata);
	/** Two attaches to one set are not guarded against: one operator, and the create-only write makes the second fail with 409 before it writes anything else. */
	if (!(await storeOriginal({ key: source.key, body, contentType: originalContentType(metadata) }, location))) {
		throw new HTTPException(409, { message: "An original is already stored for this set" });
	}

	const withSource: Manifest = { ...manifest, source };
	try {
		await storeManifest(withSource, location, { force: true });
	} catch (error) {
		await deleteObjects([source.key], location);
		throw error;
	}

	return generateMissingSizes(withSource, location, body);
};
