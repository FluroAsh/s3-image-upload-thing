import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

import type { BucketLocation, ImageVariant, Manifest } from "~/shared/types";

import { generateMissingSizes } from "./generate-sizes";
import { buildManifest, describeSource, originalExtension, sourceKey } from "./manifest";
import { storeManifest, storeOriginal } from "./s3-operations";

type Dimensions = { width: number; height: number };

/** Allows a pixel of rounding on the other edge, which is what resizing a size to whole pixels can cost. */
const sameAspect = (upload: Dimensions, variant: Dimensions): boolean =>
	Math.abs((upload.height * variant.width) / upload.width - variant.height) <= 1;

/**
 * Stores a supplied original for a set that keeps none, then fills its missing sizes as `generateMissingSizes` does.
 * No hash was ever stored, so the only proof it is the same image is its aspect ratio, after EXIF rotation, against the largest size; nothing is written on a mismatch.
 * The source is recorded before the sizes, so a failed size run leaves a set the generate action can finish.
 */
export const attachOriginal = async (
	manifest: Manifest,
	file: File,
	location: BucketLocation,
): Promise<ImageVariant[]> => {
	if (manifest.source) throw new HTTPException(409, { message: "This set already keeps an original" });
	const largest = Object.values(manifest.variants).sort((a, b) => b.width * b.height - a.width * a.height)[0];
	if (!largest) throw new HTTPException(409, { message: "This set has no size to compare an original against" });

	const body = Buffer.from(await file.arrayBuffer());
	const { autoOrient } = await sharp(body)
		.metadata()
		.catch(() => {
			throw new HTTPException(422, { message: "Not a valid image" });
		});
	if (!sameAspect(autoOrient, largest)) {
		throw new HTTPException(422, {
			message: `The image is ${autoOrient.width}×${autoOrient.height}, which does not match this set's ${largest.width}×${largest.height}`,
		});
	}

	const source = await describeSource(sourceKey(manifest, await originalExtension(file.name, body)), body);
	if (!(await storeOriginal({ key: source.key, body, contentType: file.type }, location))) {
		throw new HTTPException(409, { message: "An original is already stored for this set" });
	}

	const withSource = buildManifest({
		createdAt: manifest.createdAt,
		placeholder: manifest.placeholder,
		source,
		objects: Object.values(manifest.variants),
	});
	await storeManifest(withSource, location, { force: true });

	return generateMissingSizes(withSource, location, body);
};
