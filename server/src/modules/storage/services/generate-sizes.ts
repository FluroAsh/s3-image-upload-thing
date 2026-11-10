import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

import { errorMessage } from "@/shared/utils/helpers";
import { sizeStatuses } from "~/shared/image-sizes";
import type { BucketLocation, ImageVariant, Manifest, ManifestVariant } from "~/shared/types";

import { DEFAULT_FILE_TYPE } from "../processors/variants/config";
import { encodeVariant } from "../processors/variants/processor";
import { placeholderDataUri, variantKey } from "./manifest";
import { getObject, getObjectOrNull, putVariant, storeManifest } from "./s3-operations";

const describe = (
	key: string,
	body: Buffer,
	size: { width: number; height: number },
	etag: string,
): ManifestVariant => ({
	key,
	format: DEFAULT_FILE_TYPE,
	width: size.width,
	height: size.height,
	bytes: body.length,
	etag,
});

/**
 * Resolves the sizes written, empty when none was missing. Remakes each missing size from the kept original, create-only, and rewrites the manifest last with only what was stored.
 * A size whose write fails is left out of the manifest, which is still written for the others before the error is thrown.
 */
export const generateMissingSizes = async (manifest: Manifest, location: BucketLocation): Promise<ImageVariant[]> => {
	const missing = sizeStatuses(manifest)
		.filter(({ state }) => state === "missing")
		.map(({ name }) => name);
	if (missing.length === 0) return [];

	if (!manifest.source) throw new HTTPException(409, { message: "This set keeps no original to make sizes from" });
	const original = await getObjectOrNull(manifest.source.key, location);
	if (!original) throw new HTTPException(409, { message: "The kept original is missing from the bucket" });

	const settled = await Promise.allSettled(
		missing.map(async (name): Promise<[ImageVariant, ManifestVariant, Buffer] | null> => {
			const key = variantKey(manifest, name);
			const made = await encodeVariant(name, original.body);
			const etag = await putVariant(key, made.data, location, true);
			if (etag) return [name, describe(key, made.data, made.info, etag), made.data];

			/** A key left by a run that stored the size but not the manifest; kept as it is and recorded. */
			const existing = await getObject(key, location);
			const { width, height } = await sharp(existing.body).metadata();
			return [name, describe(key, existing.body, { width, height }, existing.etag), existing.body];
		}),
	);

	const stored = settled.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));
	const failures = settled.flatMap((result) => (result.status === "rejected" ? [errorMessage(result.reason)] : []));

	if (stored.length > 0) {
		const placeholder = stored.find(([name]) => name === "placeholder")?.[2];
		await storeManifest(
			{
				...manifest,
				placeholder: placeholder ? placeholderDataUri(placeholder) : manifest.placeholder,
				variants: { ...manifest.variants, ...Object.fromEntries(stored.map(([name, variant]) => [name, variant])) },
			},
			location,
			{ force: true },
		);
	}

	if (failures.length > 0) throw new Error(`Could not generate ${failures.length} size(s): ${failures.join("; ")}`);
	return stored.map(([name]) => name);
};
