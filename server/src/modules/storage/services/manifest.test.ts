import { describe, expect, it, vi } from "vitest";

import {
	assertManifestKey,
	buildManifest,
	classifyKey,
	groupImageSets,
	hasRefusedUploadPrefix,
	isManifest,
	isSetManifest,
	manifestKey,
	setKeyPrefix,
	uploadSetIdentity,
	variantKey,
} from "./manifest";

const NESTED_KEYS = [
	"japan-2025/kyoto/ginsui-sukiyaki-1/thumbnail_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp",
];

const classifyAll = (keys: string[]) => keys.map((key) => classifyKey(key, new Set(keys)));

describe("classifyKey", () => {
	it("classifies a file inside a folder named after it as a set", () => {
		expect(classifyAll(NESTED_KEYS)).toEqual([
			{ member: { folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "thumbnail" } },
			{ member: { folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "medium" } },
			{ member: { folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "large" } },
		]);
	});

	it("keeps underscores in a set's name (made-up key)", () => {
		const key = "trips/harbour_at_dusk/large_harbour_at_dusk.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			member: { folder: "trips", name: "harbour_at_dusk", variant: "large" },
		});
	});

	it("gives a set at the bucket root an empty folder (made-up key)", () => {
		const key = "buff-rick/large_buff-rick.webp";

		expect(classifyKey(key, new Set([key]))).toMatchObject({
			member: { folder: "", name: "buff-rick" },
		});
	});

	it("treats an un-prefixed file named after its folder as the original (made-up key)", () => {
		const key = "japan-2025/kyoto/ginsui-sukiyaki-1/ginsui-sukiyaki-1.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			member: { folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "original" },
		});
	});

	it("skips an image that is not inside a folder named after it, since only a set folder holds a set", () => {
		const keys = ["photo.webp", "trip/photo.webp", "trip/photo/small_other.webp", "trip/original.webp"];

		expect(classifyAll(keys)).toEqual(keys.map(() => ({ skip: "no-set-folder" })));
	});

	it("skips keys that are not webp, such as a video or a PNG", () => {
		const keys = ["japan-2025/raw-video/day-1-snow.mp4", "main-profle-image.png"];

		expect(classifyAll(keys)).toEqual([{ skip: "not-webp" }, { skip: "not-webp" }]);
	});

	it("skips a folder marker", () => {
		expect(classifyAll(["japan-2025/"])).toEqual([{ skip: "folder-marker" }]);
	});

	it("gives manifest.json beside a set's images its own skip reason, so it is never an image or a member", () => {
		const keys = [
			...NESTED_KEYS,
			"japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
			"buff-rick/large_buff-rick.webp",
			"buff-rick/manifest.json",
		];

		expect(classifyAll(keys).filter((result) => "skip" in result)).toEqual([
			{ skip: "set-manifest" },
			{ skip: "set-manifest" },
		]);
	});

	it("treats manifest.json as any other non-image when no image of its folder's set sits beside it", () => {
		const keys = ["data/manifest.json", "data/large_other.webp", "trip/manifest.json", "trip/trip.webp"];

		expect(classifyAll(keys).filter((_, index) => keys[index].endsWith("manifest.json"))).toEqual([
			{ skip: "not-webp" },
			{ skip: "set-manifest" },
		]);
	});

	it("classifies original.{ext} beside a set's images as that set's source, whatever its extension", () => {
		const keys = [
			"trip/photo/full_photo.webp",
			"trip/photo/original.webp",
			"buff-rick/original.jpg",
			"buff-rick/buff-rick.webp",
		];
		const trip = { folder: "trip", name: "photo" };

		expect(classifyAll(keys)).toEqual([
			{ member: { ...trip, variant: "full" } },
			{ source: trip },
			{ source: { folder: "", name: "buff-rick" } },
			{ member: { folder: "", name: "buff-rick", variant: "original" } },
		]);
	});

	it("treats original.{ext} as any other file when no image of its folder's set sits beside it", () => {
		const keys = ["trip/original.webp", "data/original.jpg", "data/large_other.webp", "original.webp"];

		expect(classifyAll(keys)).toEqual([
			{ skip: "no-set-folder" },
			{ skip: "not-webp" },
			{ skip: "no-set-folder" },
			{ skip: "no-set-folder" },
		]);
	});

	it("treats manifest.json at the bucket root, which no set folder holds, as any other non-image", () => {
		expect(classifyAll(["manifest.json"])).toEqual([{ skip: "not-webp" }]);
	});

	it("skips keys under the service-written src/ prefix, a manifest.json included", () => {
		const keys = ["src/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp", "src/ginsui-sukiyaki-1/manifest.json"];

		expect(classifyAll(keys)).toEqual([{ skip: "reserved-prefix" }, { skip: "reserved-prefix" }]);
	});

	it("classifies keys under manifests/ like any other folder", () => {
		expect(classifyAll(["manifests/trip/large_trip.webp"])).toEqual([
			{ member: { folder: "manifests", name: "trip", variant: "large" } },
		]);
	});

	it("does not skip legacy/, which only uploads refuse", () => {
		const keys = ["legacy/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp"];

		expect(classifyAll(keys)).toEqual([{ member: { folder: "legacy", name: "ginsui-sukiyaki-1", variant: "large" } }]);
	});
});

describe("isSetManifest", () => {
	it("is true only for a manifest.json with an image of its own set beside it", () => {
		const siblings = new Set(["a/b/large_b.webp", "a/c/c.webp", "a/d/large_other.webp"]);

		expect(isSetManifest("a/b/manifest.json", siblings)).toBe(true);
		expect(isSetManifest("a/c/manifest.json", siblings)).toBe(true);
		expect(isSetManifest("a/d/manifest.json", siblings)).toBe(false);
		expect(isSetManifest("a/b/large_b.webp", siblings)).toBe(false);
		expect(isSetManifest("manifest.json", siblings)).toBe(false);
	});

	it("does not take an image of another folder for the set's", () => {
		expect(isSetManifest("a/b/manifest.json", new Set(["x/a/b/large_b.webp", "a/b/c/large_b.webp"]))).toBe(false);
	});
});

describe("isManifest", () => {
	it("accepts a manifest this service built", () => {
		expect(
			isManifest(
				buildManifest({
					createdAt: "t",
					placeholder: null,
					source: null,
					objects: [{ key: NESTED_KEYS[0], width: 1, height: 1, bytes: 1, etag: '"e"' }],
				}),
			),
		).toBe(true);
	});

	it("accepts a stored manifest that still carries the retired layout field", () => {
		expect(isManifest({ schema: 1, name: "a", folder: "", layout: "nested", variants: {} })).toBe(true);
	});

	it.each([
		["a JSON object of another app", { name: "web app" }],
		["a different schema", { schema: 2, variants: {} }],
		["variants that are not an object", { schema: 1, variants: [] }],
		["null variants", { schema: 1, variants: null }],
		["a string", "manifest"],
		["null", null],
	])("refuses %s", (_label, value) => {
		expect(isManifest(value)).toBe(false);
	});
});

describe("hasRefusedUploadPrefix", () => {
	it.each(["src/a", "legacy/a", "trip/original.v2/", "original.v2/", "a/original.jpg/b/"])("refuses %s", (key) => {
		expect(hasRefusedUploadPrefix(key)).toBe(true);
	});

	it.each([
		"manifests/a",
		"trip/src/a",
		"legacy.png",
		"trip/original/",
		"trip/originals/",
		"trip/my-original.v2/",
	])("accepts %s", (key) => {
		expect(hasRefusedUploadPrefix(key)).toBe(false);
	});
});

describe("uploadSetIdentity", () => {
	it("names the set after the file without its extension and keys it under the destination", () => {
		const identity = uploadSetIdentity("trip", "photo.final.jpg");

		expect(identity).toEqual({ folder: "trip", name: "photo.final" });
		expect(setKeyPrefix(identity)).toBe("trip/photo.final/");
	});

	it("keys a set at the bucket root without a leading slash", () => {
		expect(setKeyPrefix(uploadSetIdentity("", "photo.jpg"))).toBe("photo/");
	});
});

describe("groupImageSets", () => {
	it("groups keys into sets and lists skipped keys with their reasons", () => {
		const skippedKey = "japan-2025/raw-video/day-1-snow.mp4";

		const manifest = "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json";

		const { sets, skipped } = groupImageSets([...NESTED_KEYS, manifest, skippedKey, "japan-2025/", "photo.webp"]);

		expect(sets).toEqual([
			{
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				members: [
					{ key: NESTED_KEYS[0], variant: "thumbnail" },
					{ key: NESTED_KEYS[1], variant: "medium" },
					{ key: NESTED_KEYS[2], variant: "large" },
				],
			},
		]);
		expect(skipped).toEqual([
			{ key: manifest, reason: "set-manifest" },
			{ key: skippedKey, reason: "not-webp" },
			{ key: "japan-2025/", reason: "folder-marker" },
			{ key: "photo.webp", reason: "no-set-folder" },
		]);
	});

	it("records a set's original.{ext} as its source, not as a member or a set of its own", () => {
		const { sets, skipped } = groupImageSets(["trip/photo/full_photo.webp", "trip/photo/original.webp"]);

		expect(sets).toEqual([
			{
				folder: "trip",
				name: "photo",
				source: "trip/photo/original.webp",
				members: [{ key: "trip/photo/full_photo.webp", variant: "full" }],
			},
		]);
		expect(skipped).toEqual([]);
	});

	it("keeps an unprefixed original in its set (made-up key)", () => {
		const original = "a/pier/pier.webp";

		const { sets } = groupImageSets([original, "a/pier/small_pier.webp"]);

		expect(sets).toHaveLength(1);
		expect(sets[0]).toMatchObject({ folder: "a", name: "pier" });
	});
});

describe("variantKey", () => {
	it("puts a variant in its set's folder, prefixed with its name", () => {
		expect(variantKey({ folder: "trip", name: "photo" }, "large")).toBe("trip/photo/large_photo.webp");
		expect(variantKey({ folder: "", name: "photo" }, "full")).toBe("photo/full_photo.webp");
	});
});

describe("manifestKey", () => {
	it("places a set's manifest inside the set's own folder", () => {
		expect(manifestKey({ folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1" })).toBe(
			"japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
		);
	});

	it("omits an empty folder, so a set at the bucket root keeps its manifest in {name}/", () => {
		expect(manifestKey({ folder: "", name: "buff-rick" })).toBe("buff-rick/manifest.json");
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

	const build = (keys: string[], overrides: Partial<Parameters<typeof buildManifest>[0]> = {}) =>
		buildManifest({
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source: null,
			objects: measured(keys, 120),
			...overrides,
		});

	it("records every variant of a set under the name its key uses", () => {
		expect(build(NESTED_KEYS)).toEqual({
			schema: 1,
			name: "ginsui-sukiyaki-1",
			folder: "japan-2025/kyoto",
			status: "ready",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source: null,
			variants: {
				thumbnail: {
					key: NESTED_KEYS[0],
					format: "webp",
					width: 120,
					height: 100,
					bytes: 1000,
					etag: '"etag-0"',
				},
				medium: { key: NESTED_KEYS[1], format: "webp", width: 121, height: 101, bytes: 1001, etag: '"etag-1"' },
				large: { key: NESTED_KEYS[2], format: "webp", width: 122, height: 102, bytes: 1002, etag: '"etag-2"' },
			},
		});
	});

	it("records the set's own original.{ext} as its source", () => {
		const source = {
			key: "japan-2025/kyoto/ginsui-sukiyaki-1/original.jpg",
			public: false,
			sha256: "ab".repeat(32),
			bytes: 5000,
			width: 4000,
			height: 3000,
		};

		expect(build(NESTED_KEYS, { source }).source).toEqual(source);
	});

	it.each([
		["another set's original", "japan-2025/kyoto/ginsui-sukiyaki-2/original.jpg"],
		["a size of the set", NESTED_KEYS[0]],
		["a file not named original", "japan-2025/kyoto/ginsui-sukiyaki-1/photo.jpg"],
	])("refuses %s as the source", (_label, key) => {
		const source = { key, public: false, sha256: "", bytes: 1, width: 1, height: 1 };

		expect(() => build(NESTED_KEYS, { source })).toThrow(`"${key}" is not the source file of`);
	});

	it("refuses objects that do not form exactly one image set", () => {
		expect(() => build([])).toThrow();
		expect(() => build(["japan-2025/raw-video/day-1-snow.mp4"])).toThrow();
		expect(() => build([NESTED_KEYS[0], "japan-2025/kyoto/ginsui-sukiyaki-2/large_ginsui-sukiyaki-2.webp"])).toThrow();
	});
});

describe("assertManifestKey", () => {
	it.each([
		"japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
		"buff-rick/manifest.json",
		"a/manifest.json",
		"a/b/manifest.json",
	])("accepts %s", (key) => {
		expect(() => assertManifestKey(key)).not.toThrow();
	});

	it.each([
		"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
		"DSC_1963_f6f8bf29c4.webp",
		"manifests/trip/photo.json",
		"trip/photo/manifest.json.bak",
		"trip/photo/manifest.json/",
		"trip/photo/other-manifest.json",
		"manifest.json",
		"/manifest.json",
		"src/photo/manifest.json",
		"src/x/manifest.json",
		"a//manifest.json",
		"a/b/manifest.json/",
		"a/Manifest.json",
		"a/manifest.jsonx",
		"",
	])("refuses '%s', which is not manifest.json inside a folder", (key) => {
		expect(() => assertManifestKey(key)).toThrow(
			`Refusing to write "${key}": a manifest is only stored as manifest.json inside its set's folder`,
		);
	});
});

describe("cdnPathOf", () => {
	it("prefixes only buckets named in the setting", async () => {
		vi.stubEnv("BUCKET_CDN_PREFIXES", JSON.stringify({ "legacy-bucket": "legacy/" }));
		vi.resetModules();
		const { cdnPathOf } = await import("./manifest");

		expect(cdnPathOf("legacy-bucket", "a/b")).toBe("legacy/a/b");
		expect(cdnPathOf("example-bucket", "a/b")).toBe("a/b");
		vi.unstubAllEnvs();
	});
});
