import { MANIFEST_FILE_NAME } from "@/modules/storage/services/manifest";
import type { Manifest } from "~/shared/types";

export const LEGACY_PREFIX = "legacy";

export const legacyKey = (key: string): string => `${LEGACY_PREFIX}/${key}`;

export const isManifestKey = (key: string): boolean => key.endsWith(`/${MANIFEST_FILE_NAME}`);

/** The manifest of the same set after it moves under `legacy/`: its folder and every key it records follow the move. */
export const moveManifest = (manifest: Manifest): Manifest => ({
	...manifest,
	folder: manifest.folder ? legacyKey(manifest.folder) : LEGACY_PREFIX,
	source: manifest.source && { ...manifest.source, key: legacyKey(manifest.source.key) },
	variants: Object.fromEntries(
		Object.entries(manifest.variants).map(([variant, value]) => [variant, { ...value, key: legacyKey(value.key) }]),
	),
});
