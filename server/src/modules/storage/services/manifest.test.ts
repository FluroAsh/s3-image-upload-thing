import { describe, expect, it } from "vitest";

import { buildManifest, classifyKey, manifestKey } from "./manifest";

const NESTED_KEYS = [
	"japan-2025/tokyo/tokyo-1/thumbnail_tokyo-1.webp",
	"japan-2025/tokyo/tokyo-1/medium_tokyo-1.webp",
	"japan-2025/tokyo/tokyo-1/large_tokyo-1.webp",
];

// The legacy bucket holds these at its root; the name itself contains underscores.
const FLAT_KEYS = [
	"pg_ash_portrait_b6eaf6bf22.webp",
	"thumbnail_pg_ash_portrait_b6eaf6bf22.webp",
	"small_pg_ash_portrait_b6eaf6bf22.webp",
	"medium_pg_ash_portrait_b6eaf6bf22.webp",
	"large_pg_ash_portrait_b6eaf6bf22.webp",
];

const classifyAll = (keys: string[]) => keys.map((key) => classifyKey(key, new Set(keys)));

describe("classifyKey", () => {
	it("classifies a file inside a folder named after it as a nested set", () => {
		expect(classifyAll(NESTED_KEYS)).toEqual([
			{ layout: "nested", folder: "japan-2025/tokyo", name: "tokyo-1", variant: "thumbnail" },
			{ layout: "nested", folder: "japan-2025/tokyo", name: "tokyo-1", variant: "medium" },
			{ layout: "nested", folder: "japan-2025/tokyo", name: "tokyo-1", variant: "large" },
		]);
	});

	it("keeps underscores in a nested set's name", () => {
		const key = "trips/harbour_at_dusk/large_harbour_at_dusk.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			layout: "nested",
			folder: "trips",
			name: "harbour_at_dusk",
			variant: "large",
		});
	});

	it("gives a nested set at the bucket root an empty folder", () => {
		const key = "tokyo-1/large_tokyo-1.webp";

		expect(classifyKey(key, new Set([key]))).toMatchObject({ layout: "nested", folder: "", name: "tokyo-1" });
	});

	it("classifies a flat set at the bucket root with an empty folder", () => {
		const set = { layout: "flat", folder: "", name: "pg_ash_portrait_b6eaf6bf22" };

		expect(classifyAll(FLAT_KEYS)).toEqual([
			{ ...set, variant: "original" },
			{ ...set, variant: "thumbnail" },
			{ ...set, variant: "small" },
			{ ...set, variant: "medium" },
			{ ...set, variant: "large" },
		]);
	});

	it("uses the parent path as a flat set's folder", () => {
		const keys = ["archive/2024/pier.webp", "archive/2024/small_pier.webp"];

		expect(classifyAll(keys)).toEqual([
			{ layout: "flat", folder: "archive/2024", name: "pier", variant: "original" },
			{ layout: "flat", folder: "archive/2024", name: "pier", variant: "small" },
		]);
	});

	it("classifies an un-prefixed file with no variants as a flat set holding only the original", () => {
		const key = "pg_ash_portrait_b6eaf6bf22.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			layout: "flat",
			folder: "",
			name: "pg_ash_portrait_b6eaf6bf22",
			variant: "original",
		});
	});

	it("does not treat small_talk.webp as a variant of talk.webp unless that file exists", () => {
		expect(classifyKey("small_talk.webp", new Set(["small_talk.webp"]))).toBeNull();

		expect(classifyKey("small_talk.webp", new Set(["small_talk.webp", "talk.webp"]))).toEqual({
			layout: "flat",
			folder: "",
			name: "talk",
			variant: "small",
		});
	});

	it("only accepts a sibling from the same folder", () => {
		expect(classifyKey("a/small_talk.webp", new Set(["a/small_talk.webp", "b/talk.webp", "talk.webp"]))).toBeNull();
	});

	it("skips keys that are not webp, such as a video or a PNG", () => {
		const keys = ["japan-2025/raw-video/shibuya-crossing.mp4", "og-image.png", "japan-2025/tokyo/"];

		expect(classifyAll(keys)).toEqual([null, null, null]);
	});

	it("skips keys under the reserved manifests/ and src/ prefixes", () => {
		const keys = [
			"manifests/japan-2025/tokyo/tokyo-1.json",
			"manifests/tokyo-1.webp",
			"src/tokyo-1/large_tokyo-1.webp",
		];

		expect(classifyAll(keys)).toEqual([null, null, null]);
	});
});

describe("manifestKey", () => {
	it("places a nested set's manifest under manifests/{folder}/", () => {
		expect(manifestKey({ pathPrefix: "", folder: "japan-2025/tokyo", name: "tokyo-1" })).toBe(
			"manifests/japan-2025/tokyo/tokyo-1.json",
		);
	});

	it("includes the path prefix and omits an empty folder", () => {
		expect(manifestKey({ pathPrefix: "legacy/", folder: "", name: "pg_ash_portrait_b6eaf6bf22" })).toBe(
			"manifests/legacy/pg_ash_portrait_b6eaf6bf22.json",
		);
	});
});

describe("buildManifest", () => {
	const measured = (keys: string[], width: number) =>
		keys.map((key, index) => ({
			key,
			width: width + index,
			height: 100 + index,
			bytes: 1000 + index,
			etag: `"etag-${index}"`,
		}));

	it("records every variant of a nested set under the name its key uses", () => {
		const manifest = buildManifest({
			bucket: "example-bucket",
			pathPrefix: "",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source: null,
			objects: measured(NESTED_KEYS, 120),
		});

		expect(manifest).toEqual({
			schema: 1,
			name: "tokyo-1",
			folder: "japan-2025/tokyo",
			bucket: "example-bucket",
			pathPrefix: "",
			layout: "nested",
			status: "ready",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source: null,
			variants: {
				thumbnail: {
					key: "japan-2025/tokyo/tokyo-1/thumbnail_tokyo-1.webp",
					format: "webp",
					width: 120,
					height: 100,
					bytes: 1000,
					etag: '"etag-0"',
				},
				medium: {
					key: "japan-2025/tokyo/tokyo-1/medium_tokyo-1.webp",
					format: "webp",
					width: 121,
					height: 101,
					bytes: 1001,
					etag: '"etag-1"',
				},
				large: {
					key: "japan-2025/tokyo/tokyo-1/large_tokyo-1.webp",
					format: "webp",
					width: 122,
					height: 102,
					bytes: 1002,
					etag: '"etag-2"',
				},
			},
		});
	});

	it("records a flat set's original, bucket and path prefix, keeping bucket keys free of the prefix", () => {
		const source = {
			key: "pg_ash_portrait_b6eaf6bf22.webp",
			public: true,
			sha256: "0".repeat(64),
			bytes: 1000,
			width: 2160,
			height: 100,
		};

		const manifest = buildManifest({
			bucket: "example-legacy-bucket",
			pathPrefix: "legacy/",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: "data:image/webp;base64,AAAA",
			source,
			objects: measured(FLAT_KEYS, 2160),
		});

		expect(manifest).toMatchObject({
			name: "pg_ash_portrait_b6eaf6bf22",
			folder: "",
			bucket: "example-legacy-bucket",
			pathPrefix: "legacy/",
			layout: "flat",
			placeholder: "data:image/webp;base64,AAAA",
			source,
		});
		expect(Object.keys(manifest.variants)).toEqual(["original", "thumbnail", "small", "medium", "large"]);
		expect(manifest.variants.original.key).toBe("pg_ash_portrait_b6eaf6bf22.webp");
		expect(manifest.variants.small.key).toBe("small_pg_ash_portrait_b6eaf6bf22.webp");
		expect(manifestKey(manifest)).toBe("manifests/legacy/pg_ash_portrait_b6eaf6bf22.json");
	});

	it("refuses objects that do not form exactly one image set", () => {
		const build = (keys: string[]) =>
			buildManifest({
				bucket: "example-bucket",
				pathPrefix: "",
				createdAt: "2026-10-10T03:12:45Z",
				placeholder: null,
				source: null,
				objects: measured(keys, 120),
			});

		expect(() => build([])).toThrow();
		expect(() => build(["japan-2025/raw-video/shibuya-crossing.mp4"])).toThrow();
		expect(() => build([NESTED_KEYS[0], "japan-2025/tokyo/tokyo-2/large_tokyo-2.webp"])).toThrow();
	});
});
