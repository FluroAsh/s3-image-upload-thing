import { describe, expect, it } from "vitest";

import {
	assertManifestKey,
	buildManifest,
	classifyKey,
	groupImageSets,
	hasRefusedUploadPrefix,
	manifestKey,
	setKeyPrefix,
	uploadSetIdentity,
} from "./manifest";

const NESTED_KEYS = [
	"japan-2025/kyoto/ginsui-sukiyaki-1/thumbnail_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp",
];

// The legacy bucket holds these at its root; the name itself contains underscores.
const FLAT_KEYS = [
	"DSC_1963_f6f8bf29c4.webp",
	"thumbnail_DSC_1963_f6f8bf29c4.webp",
	"small_DSC_1963_f6f8bf29c4.webp",
	"medium_DSC_1963_f6f8bf29c4.webp",
	"large_DSC_1963_f6f8bf29c4.webp",
];

const FLAT_NAME = "DSC_1963_f6f8bf29c4";

const classifyAll = (keys: string[]) => keys.map((key) => classifyKey(key, new Set(keys)));

describe("classifyKey", () => {
	it("classifies a file inside a folder named after it as a nested set", () => {
		expect(classifyAll(NESTED_KEYS)).toEqual([
			{ member: { layout: "nested", folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "thumbnail" } },
			{ member: { layout: "nested", folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "medium" } },
			{ member: { layout: "nested", folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "large" } },
		]);
	});

	it("keeps underscores in a nested set's name (made-up key: no real nested name has one)", () => {
		const key = "trips/harbour_at_dusk/large_harbour_at_dusk.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			member: { layout: "nested", folder: "trips", name: "harbour_at_dusk", variant: "large" },
		});
	});

	it("gives a nested set at the bucket root an empty folder (made-up key)", () => {
		const key = "buff-rick/large_buff-rick.webp";

		expect(classifyKey(key, new Set([key]))).toMatchObject({
			member: { layout: "nested", folder: "", name: "buff-rick" },
		});
	});

	it("treats an un-prefixed file named after its folder as the nested original (made-up key)", () => {
		const key = "japan-2025/kyoto/ginsui-sukiyaki-1/ginsui-sukiyaki-1.webp";

		expect(classifyKey(key, new Set([key]))).toEqual({
			member: { layout: "nested", folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1", variant: "original" },
		});
	});

	it("classifies a flat set at the bucket root with an empty folder", () => {
		const member = { layout: "flat", folder: "", name: FLAT_NAME };

		expect(classifyAll(FLAT_KEYS)).toEqual([
			{ member: { ...member, variant: "original" } },
			{ member: { ...member, variant: "thumbnail" } },
			{ member: { ...member, variant: "small" } },
			{ member: { ...member, variant: "medium" } },
			{ member: { ...member, variant: "large" } },
		]);
	});

	it("uses the parent path as a flat set's folder (made-up keys: real flat sets sit at the root)", () => {
		const keys = ["images/spiderman_train_hold_bdcd1aab3b.webp", "images/small_spiderman_train_hold_bdcd1aab3b.webp"];

		expect(classifyAll(keys)).toEqual([
			{ member: { layout: "flat", folder: "images", name: "spiderman_train_hold_bdcd1aab3b", variant: "original" } },
			{ member: { layout: "flat", folder: "images", name: "spiderman_train_hold_bdcd1aab3b", variant: "small" } },
		]);
	});

	it("treats any text before the first underscore as a variant when the rest exists beside it (made-up prefix)", () => {
		const keys = [`${FLAT_NAME}.webp`, `xlarge_${FLAT_NAME}.webp`];

		expect(classifyKey(keys[1], new Set(keys))).toEqual({
			member: { layout: "flat", folder: "", name: FLAT_NAME, variant: "xlarge" },
		});
	});

	it("classifies an un-prefixed file with no variants as a flat set holding only the original", () => {
		const key = `${FLAT_NAME}.webp`;

		expect(classifyKey(key, new Set([key]))).toEqual({
			member: { layout: "flat", folder: "", name: FLAT_NAME, variant: "original" },
		});
	});

	it("makes small_talk.webp its own flat set unless talk.webp exists (made-up keys)", () => {
		expect(classifyKey("small_talk.webp", new Set(["small_talk.webp"]))).toEqual({
			member: { layout: "flat", folder: "", name: "small_talk", variant: "original" },
		});

		expect(classifyKey("small_talk.webp", new Set(["small_talk.webp", "talk.webp"]))).toEqual({
			member: { layout: "flat", folder: "", name: "talk", variant: "small" },
		});
	});

	it("only accepts a sibling from the same folder (made-up keys)", () => {
		expect(classifyKey("a/small_talk.webp", new Set(["a/small_talk.webp", "b/talk.webp", "talk.webp"]))).toEqual({
			member: { layout: "flat", folder: "a", name: "small_talk", variant: "original" },
		});
	});

	it("skips keys that are not webp, such as a video or a PNG", () => {
		const keys = ["japan-2025/raw-video/day-1-snow.mp4", "main-profle-image.png"];

		expect(classifyAll(keys)).toEqual([{ skip: "not-webp" }, { skip: "not-webp" }]);
	});

	it("skips a folder marker", () => {
		expect(classifyAll(["japan-2025/"])).toEqual([{ skip: "folder-marker" }]);
	});

	it("skips keys under the service-written manifests/ and src/ prefixes", () => {
		const keys = [
			"manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json",
			"manifests/ginsui-sukiyaki-1.webp",
			"src/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp",
		];

		expect(classifyAll(keys)).toEqual([
			{ skip: "reserved-prefix" },
			{ skip: "reserved-prefix" },
			{ skip: "reserved-prefix" },
		]);
	});

	it("does not skip legacy/, which only uploads refuse", () => {
		const keys = ["legacy/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp"];

		expect(classifyAll(keys)).toEqual([
			{ member: { layout: "nested", folder: "legacy", name: "ginsui-sukiyaki-1", variant: "large" } },
		]);
	});
});

describe("hasRefusedUploadPrefix", () => {
	it.each(["manifests/a", "src/a", "legacy/a"])("refuses %s", (key) => {
		expect(hasRefusedUploadPrefix(key)).toBe(true);
	});

	it.each(["manifests-2025/a", "trip/manifests/a", "legacy.png"])("accepts %s", (key) => {
		expect(hasRefusedUploadPrefix(key)).toBe(false);
	});
});

describe("uploadSetIdentity", () => {
	it("names the set after the file without its extension and keys it under the destination", () => {
		const identity = uploadSetIdentity("trip", "photo.final.jpg");

		expect(identity).toEqual({ pathPrefix: "", folder: "trip", name: "photo.final" });
		expect(setKeyPrefix(identity)).toBe("trip/photo.final/");
	});

	it("keys a set at the bucket root without a leading slash", () => {
		expect(setKeyPrefix(uploadSetIdentity("", "photo.jpg"))).toBe("photo/");
	});
});

describe("groupImageSets", () => {
	it("groups keys into sets and lists skipped keys with their reasons", () => {
		const skippedKey = "japan-2025/raw-video/day-1-snow.mp4";

		const { sets, skipped } = groupImageSets([...FLAT_KEYS, ...NESTED_KEYS, skippedKey, "japan-2025/"]);

		expect(sets).toEqual([
			{
				layout: "flat",
				folder: "",
				name: FLAT_NAME,
				members: [
					{ key: FLAT_KEYS[0], variant: "original" },
					{ key: FLAT_KEYS[1], variant: "thumbnail" },
					{ key: FLAT_KEYS[2], variant: "small" },
					{ key: FLAT_KEYS[3], variant: "medium" },
					{ key: FLAT_KEYS[4], variant: "large" },
				],
			},
			{
				layout: "nested",
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
			{ key: skippedKey, reason: "not-webp" },
			{ key: "japan-2025/", reason: "folder-marker" },
		]);
	});

	it("keeps an unprefixed nested original in the nested set rather than a flat one (made-up key)", () => {
		const original = "a/pier/pier.webp";

		const { sets } = groupImageSets([original, "a/pier/small_pier.webp"]);

		expect(sets).toHaveLength(1);
		expect(sets[0]).toMatchObject({ layout: "nested", folder: "a", name: "pier" });
	});
});

describe("manifestKey", () => {
	it("places a nested set's manifest under manifests/{folder}/", () => {
		expect(manifestKey({ pathPrefix: "", folder: "japan-2025/kyoto", name: "ginsui-sukiyaki-1" })).toBe(
			"manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json",
		);
	});

	it("includes the path prefix and omits an empty folder", () => {
		expect(manifestKey({ pathPrefix: "legacy/", folder: "", name: FLAT_NAME })).toBe(
			`manifests/legacy/${FLAT_NAME}.json`,
		);
	});

	it("rejects a path prefix that does not end with a slash", () => {
		expect(() => manifestKey({ pathPrefix: "legacy", folder: "", name: FLAT_NAME })).toThrow();
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
			sha256: index === 0 ? "0".repeat(64) : undefined,
		}));

	const build = (keys: string[], overrides: Partial<Parameters<typeof buildManifest>[0]> = {}) =>
		buildManifest({
			bucket: "example-bucket",
			pathPrefix: "",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source: null,
			objects: measured(keys, 120),
			...overrides,
		});

	it("records every variant of a nested set under the name its key uses", () => {
		const source = {
			key: "src/ginsui-sukiyaki-1.jpg",
			public: false,
			sha256: "1".repeat(64),
			bytes: 9,
			width: 8,
			height: 7,
		};

		expect(build(NESTED_KEYS, { source })).toEqual({
			schema: 1,
			name: "ginsui-sukiyaki-1",
			folder: "japan-2025/kyoto",
			bucket: "example-bucket",
			pathPrefix: "",
			layout: "nested",
			status: "ready",
			createdAt: "2026-10-10T03:12:45Z",
			placeholder: null,
			source,
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

	it("derives a flat set's source from its original and keeps bucket keys free of the prefix", () => {
		const manifest = build(FLAT_KEYS, {
			bucket: "example-legacy-bucket",
			pathPrefix: "legacy/",
			placeholder: "data:image/webp;base64,AAAA",
			source: { key: "ignored", public: false, sha256: "f".repeat(64), bytes: 1, width: 1, height: 1 },
		});

		expect(manifest).toMatchObject({
			name: FLAT_NAME,
			folder: "",
			bucket: "example-legacy-bucket",
			pathPrefix: "legacy/",
			layout: "flat",
			placeholder: "data:image/webp;base64,AAAA",
			source: { key: FLAT_KEYS[0], public: true, sha256: "0".repeat(64), bytes: 1000, width: 120, height: 100 },
		});
		expect(Object.keys(manifest.variants)).toEqual(["original", "thumbnail", "small", "medium", "large"]);
		expect(manifest.variants.small.key).toBe(`small_${FLAT_NAME}.webp`);
		expect(manifestKey(manifest)).toBe(`manifests/legacy/${FLAT_NAME}.json`);
	});

	it("refuses a flat set whose original has no sha256", () => {
		const objects = measured(FLAT_KEYS, 120).map((object) => ({ ...object, sha256: undefined }));

		expect(() => build(FLAT_KEYS, { objects })).toThrow(/sha256/);
	});

	it("refuses a path prefix that does not end with a slash", () => {
		expect(() => build(NESTED_KEYS, { pathPrefix: "legacy" })).toThrow();
	});

	it("refuses objects that do not form exactly one image set", () => {
		expect(() => build([])).toThrow();
		expect(() => build(["japan-2025/raw-video/day-1-snow.mp4"])).toThrow();
		expect(() => build([NESTED_KEYS[0], "japan-2025/kyoto/ginsui-sukiyaki-2/large_ginsui-sukiyaki-2.webp"])).toThrow();
	});
});

describe("assertManifestKey", () => {
	it("accepts a key under manifests/", () => {
		expect(() => assertManifestKey("manifests/legacy/DSC_1963_f6f8bf29c4.json")).not.toThrow();
	});

	it.each([
		"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
		"DSC_1963_f6f8bf29c4.webp",
		"legacy/manifests/a.json",
		"manifests.json",
		"",
	])("refuses '%s', which is outside manifests/", (key) => {
		expect(() => assertManifestKey(key)).toThrow(
			`Refusing to write "${key}": manifests are only stored under manifests/`,
		);
	});
});
