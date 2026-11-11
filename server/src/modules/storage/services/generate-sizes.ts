import { HTTPException } from "hono/http-exception";
import sharp from "sharp";

import { errorMessage } from "@/shared/utils/helpers";
import { sizeStatuses } from "~/shared/image-sizes";
import type { BucketLocation, ImageVariant, Manifest, ManifestVariant } from "~/shared/types";

import { encodeVariant } from "../processors/variants/processor";
import { buildManifest, placeholderDataUri, variantKey } from "./manifest";
import { getObject, getObjectOrNull, putVariant, storeManifest } from "./s3-operations";

/**
 * Resolves the sizes written, empty when none was missing. Remakes each missing size from the kept original, create-only, and rewrites the manifest last with only what was stored.
 * A size whose write fails is left out of the manifest, which is still written for the others before the error is thrown.
 */
export const generateMissingSizes = async (
	manifest: Manifest,
	location: BucketLocation,
	/** The source's bytes when the caller already holds them, so they are not read back. */
	heldOriginal?: Buffer,
): Promise<ImageVariant[]> => {
	const missing = sizeStatuses(manifest)
		.filter(({ state }) => state === "missing")
		.map(({ name }) => name);
	if (missing.length === 0) return [];

	if (!manifest.source) throw new HTTPException(409, { message: "This set keeps no original to make sizes from" });
	const original = heldOriginal ?? (await getObjectOrNull(manifest.source.key, location))?.body;
	if (!original) throw new HTTPException(409, { message: "The kept original is missing from the bucket" });

	const settled = await Promise.allSettled(
		missing.map(async (name): Promise<[ImageVariant, Omit<ManifestVariant, "format">, Buffer] | null> => {
			const key = variantKey(manifest, name);
			const made = await encodeVariant(name, original);
			const etag = await putVariant(key, made.data, location, { createOnly: true });
			if (etag)
				return [
					name,
					{ key, width: made.info.width, height: made.info.height, bytes: made.data.length, etag },
					made.data,
				];

			/** A key left by a run that stored the size but not the manifest; kept as it is and recorded. */
			const existing = await getObject(key, location);
			const { width, height } = await sharp(existing.body).metadata();
			return [name, { key, width, height, bytes: existing.body.length, etag: existing.etag }, existing.body];
		}),
	);

	const stored = settled.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));
	const failures = settled.flatMap((result) => (result.status === "rejected" ? [errorMessage(result.reason)] : []));

	if (stored.length > 0) {
		const placeholder = stored.find(([name]) => name === "placeholder")?.[2];
		await storeManifest(
			buildManifest({
				createdAt: manifest.createdAt,
				placeholder: placeholder ? placeholderDataUri(placeholder) : manifest.placeholder,
				source: manifest.source,
				objects: [...Object.values(manifest.variants), ...stored.map(([, variant]) => variant)],
			}),
			location,
			{ force: true },
		);
	}

	if (failures.length > 0) throw new Error(`Could not generate ${failures.length} size(s): ${failures.join("; ")}`);
	return stored.map(([name]) => name);
};
