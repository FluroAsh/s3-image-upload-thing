import { describe, expect, it } from "vitest";

import { assertImageSets, buildBackfillReport, formatBackfillReport } from "./backfill-report";

/** Gives every key its own ETag unless one is supplied, so only the ETag tests have to think about them. */
const objects = (keys: string[], etags: Record<string, string> = {}) =>
	keys.map((key) => ({ key, etag: etags[key] ?? `"etag-of-${key}"` }));

const NESTED_KEYS = [
	"japan-2025/kyoto/ginsui-sukiyaki-1/thumbnail_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp",
];

const FLAT_KEYS = [
	"DSC_1963_f6f8bf29c4.webp",
	"thumbnail_DSC_1963_f6f8bf29c4.webp",
	"small_DSC_1963_f6f8bf29c4.webp",
	"medium_DSC_1963_f6f8bf29c4.webp",
	"large_DSC_1963_f6f8bf29c4.webp",
];

describe("buildBackfillReport", () => {
	it("counts the keys it was given and the image sets by layout", () => {
		const report = buildBackfillReport(objects([...NESTED_KEYS, ...FLAT_KEYS]), { pathPrefix: "" });

		expect(report.keyCount).toBe(8);
		expect(report.setsByLayout).toEqual({ nested: 1, flat: 1 });
	});

	it("returns the sets it counted, with their members", () => {
		const report = buildBackfillReport(objects([...NESTED_KEYS, "notes.txt"]), { pathPrefix: "" });

		expect(report.sets).toEqual([
			{
				layout: "nested",
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				members: NESTED_KEYS.map((key) => ({ key, variant: key.split("/").pop()?.split("_")[0] })),
			},
		]);
	});

	it("counts sets by layout and the variant names they hold, whatever order the keys were listed in", () => {
		const secondNested = [
			"japan-2025/kyoto/ginsui-sukiyaki-2/large_ginsui-sukiyaki-2.webp",
			"japan-2025/kyoto/ginsui-sukiyaki-2/thumbnail_ginsui-sukiyaki-2.webp",
			"japan-2025/kyoto/ginsui-sukiyaki-2/medium_ginsui-sukiyaki-2.webp",
		];

		const report = buildBackfillReport(objects([...NESTED_KEYS, ...FLAT_KEYS, ...secondNested]), { pathPrefix: "" });

		expect(report.variantCombinations).toEqual([
			{ layout: "nested", variants: ["large", "medium", "thumbnail"], count: 2 },
			{ layout: "flat", variants: ["large", "medium", "original", "small", "thumbnail"], count: 1 },
		]);
	});

	it("lists every skipped key with the classifier's reason", () => {
		const report = buildBackfillReport(
			objects([...NESTED_KEYS, "japan-2025/", "japan-2025/raw-video/clip-1.mp4", "manifests/japan-2025/a.json"]),
			{ pathPrefix: "" },
		);

		expect(report.skipped).toEqual([
			{ key: "japan-2025/", reason: "folder-marker" },
			{ key: "japan-2025/raw-video/clip-1.mp4", reason: "not-webp" },
			{ key: "manifests/japan-2025/a.json", reason: "reserved-prefix" },
		]);
	});

	it("lists the sets that lack a medium or a large variant, with the names they lack", () => {
		const noLarge = FLAT_KEYS.filter((key) => !key.startsWith("large_"));
		const loneFile = "DSC_2007_10e10829a9.webp";

		const report = buildBackfillReport(objects([...NESTED_KEYS, ...noLarge, loneFile]), { pathPrefix: "" });

		expect(report.missingRequired).toEqual([
			{ layout: "flat", folder: "", name: "DSC_1963_f6f8bf29c4", missing: ["large"] },
			{ layout: "flat", folder: "", name: "DSC_2007_10e10829a9", missing: ["medium", "large"] },
		]);
	});

	it("lists the sets where two variant names share an ETag", () => {
		const [thumbnail, medium, large] = NESTED_KEYS;

		const report = buildBackfillReport(
			objects([...NESTED_KEYS, ...FLAT_KEYS], {
				[medium]: '"same-file"',
				[large]: '"same-file"',
				[thumbnail]: '"other"',
			}),
			{ pathPrefix: "" },
		);

		expect(report.sharedEtags).toEqual([
			{
				layout: "nested",
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				etag: '"same-file"',
				variants: ["medium", "large"],
			},
		]);
	});

	it("does not treat missing ETags as a shared ETag", () => {
		const [thumbnail, medium, large] = NESTED_KEYS;

		const report = buildBackfillReport(objects(NESTED_KEYS, { [thumbnail]: "", [medium]: "", [large]: '"own"' }), {
			pathPrefix: "",
		});

		expect(report.sharedEtags).toEqual([]);
	});

	it("does not report an ETag shared by two different sets", () => {
		const report = buildBackfillReport(
			objects([...NESTED_KEYS, ...FLAT_KEYS], { [NESTED_KEYS[0]]: '"same-file"', [FLAT_KEYS[0]]: '"same-file"' }),
			{ pathPrefix: "" },
		);

		expect(report.sharedEtags).toEqual([]);
	});

	it("lists sets whose manifests would be written to the same key", () => {
		const report = buildBackfillReport(
			objects([
				"trips/harbour.webp",
				"trips/harbour/medium_harbour.webp",
				"trips/harbour/large_harbour.webp",
				...NESTED_KEYS,
			]),
			{ pathPrefix: "legacy/" },
		);

		expect(report.collisions).toEqual([
			{
				manifestKey: "manifests/legacy/trips/harbour.json",
				sets: [
					{ layout: "flat", folder: "trips", name: "harbour" },
					{ layout: "nested", folder: "trips", name: "harbour" },
				],
			},
		]);
	});

	it("lists sets with jpg, jpeg or png members apart, with how the classifier placed any webp beside them", () => {
		const report = buildBackfillReport(
			objects([
				...FLAT_KEYS,
				"DSC_2361_91d38a3053.jpg",
				"thumbnail_DSC_2361_91d38a3053.jpg",
				"large_DSC_2361_91d38a3053.webp",
				"backups/db.tar.gz",
			]),
			{ pathPrefix: "legacy/" },
		);

		expect(report.nonWebpSets).toEqual([
			{
				layout: "flat",
				folder: "",
				name: "DSC_2361_91d38a3053",
				members: [
					{ key: "DSC_2361_91d38a3053.jpg", variant: "original" },
					{ key: "thumbnail_DSC_2361_91d38a3053.jpg", variant: "thumbnail" },
				],
				webpSiblings: [
					{
						key: "large_DSC_2361_91d38a3053.webp",
						variant: "large",
						classifiedAs: { name: "large_DSC_2361_91d38a3053", variant: "original" },
					},
				],
			},
		]);
	});
});

describe("formatBackfillReport", () => {
	it("prints every section as plain text, with a count on each heading", () => {
		const [thumbnail, medium, large] = NESTED_KEYS;
		const report = buildBackfillReport(
			objects(
				[
					...NESTED_KEYS,
					"japan-2025/",
					"trips/harbour.webp",
					"trips/harbour/medium_harbour.webp",
					"trips/harbour/large_harbour.webp",
					"DSC_2361_91d38a3053.jpg",
					"thumbnail_DSC_2361_91d38a3053.jpg",
					"large_DSC_2361_91d38a3053.webp",
				],
				{ [thumbnail]: '"t"', [medium]: '"same-file"', [large]: '"same-file"' },
			),
			{ pathPrefix: "" },
		);

		expect(formatBackfillReport(report)).toBe(
			[
				"Keys listed: 10",
				"",
				"Sets by layout",
				"  nested: 2",
				"  flat: 2",
				"",
				"Sets by variant names",
				"  nested large+medium+thumbnail: 1",
				"  flat original: 2",
				"  nested large+medium: 1",
				"",
				"Skipped keys: 3",
				"  reserved-prefix: 0",
				"  folder-marker: 1",
				"  not-webp: 2",
				"  empty-name: 0",
				"  [folder-marker] japan-2025/",
				"  [not-webp] DSC_2361_91d38a3053.jpg",
				"  [not-webp] thumbnail_DSC_2361_91d38a3053.jpg",
				"",
				"Sets where two variant names share an ETag: 1",
				'  nested japan-2025/kyoto/ginsui-sukiyaki-1: medium = large ("same-file")',
				"",
				"Sets missing medium or large: 2",
				"  flat trips/harbour: medium, large",
				"  flat large_DSC_2361_91d38a3053: medium, large",
				"",
				"Manifest key collisions: 1",
				"  manifests/trips/harbour.json: flat trips/harbour, nested trips/harbour",
				"",
				"Sets with jpg/jpeg/png members: 1 (webp keys beside them: 1)",
				"  flat DSC_2361_91d38a3053: original, thumbnail",
				'    large_DSC_2361_91d38a3053.webp is classified as original of "large_DSC_2361_91d38a3053"',
			].join("\n"),
		);
	});
});

describe("assertImageSets", () => {
	it("passes when the keys form at least one set", () => {
		expect(() =>
			assertImageSets(buildBackfillReport(objects(NESTED_KEYS), { pathPrefix: "" }), "example-bucket"),
		).not.toThrow();
	});

	it("fails, naming the scope and the key count, when keys exist but none form a set", () => {
		const report = buildBackfillReport(objects(["notes.txt", "photos/", "DSC_1.jpg"]), { pathPrefix: "" });

		expect(() => assertImageSets(report, "example-bucket (folder docs)")).toThrow(
			"No image sets in example-bucket (folder docs): its 3 keys belong to none",
		);
	});
});
