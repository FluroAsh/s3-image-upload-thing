import { describe, expect, it } from "vitest";

import type { Manifest } from "~/shared/types";

import { isManifestKey, moveManifest } from "./manifest";

const manifest = (folder: string): Manifest => {
	const prefix = folder ? `${folder}/` : "";
	return {
		schema: 1,
		name: "photo",
		folder,
		layout: "nested",
		status: "ready",
		createdAt: "2026-11-01T00:00:00.000Z",
		placeholder: null,
		source: { key: `${prefix}photo/original.webp`, public: false, sha256: "ab", bytes: 1, width: 2, height: 3 },
		variants: {
			large: { key: `${prefix}photo/large_photo.webp`, format: "webp", width: 2, height: 3, bytes: 4, etag: '"e"' },
		},
	};
};

describe("moveManifest", () => {
	it("puts a root-level set in the legacy folder and prefixes every recorded key", () => {
		const moved = moveManifest(manifest(""));

		expect(moved.folder).toBe("legacy");
		expect(moved.source?.key).toBe("legacy/photo/original.webp");
		expect(moved.variants.large.key).toBe("legacy/photo/large_photo.webp");
	});

	it("keeps a set's own folder beneath legacy", () => {
		expect(moveManifest(manifest("static-assets")).folder).toBe("legacy/static-assets");
	});

	it("keeps a set with no source", () => {
		expect(moveManifest({ ...manifest(""), source: null }).source).toBeNull();
	});
});

describe("isManifestKey", () => {
	it("matches only a manifest.json inside a folder", () => {
		expect(isManifestKey("a/manifest.json")).toBe(true);
		expect(isManifestKey("a/not-manifest.json")).toBe(false);
		expect(isManifestKey("manifest.json")).toBe(false);
	});
});
