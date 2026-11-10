import { describe, expect, it } from "vitest";

import { assertImageSets, buildBackfillReport, formatBackfillReport } from "./report";

/** Gives every key its own ETag unless one is supplied, so only the ETag tests have to think about them. */
const objects = (keys: string[], etags: Record<string, string> = {}) =>
	keys.map((key) => ({ key, etag: etags[key] ?? `"etag-of-${key}"` }));

const NESTED_KEYS = [
	"japan-2025/kyoto/ginsui-sukiyaki-1/thumbnail_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp",
];

const HARBOUR_KEYS = [
	"trips/harbour/medium_harbour.webp",
	"trips/harbour/large_harbour.webp",
	"trips/harbour/harbour.webp",
];

describe("buildBackfillReport", () => {
	it("counts the keys it was given", () => {
		const report = buildBackfillReport(objects([...NESTED_KEYS, "notes.txt"]));

		expect(report.keyCount).toBe(4);
	});

	it("returns the sets it counted, with their members", () => {
		const report = buildBackfillReport(objects([...NESTED_KEYS, "notes.txt"]));

		expect(report.sets).toEqual([
			{
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				members: NESTED_KEYS.map((key) => ({ key, variant: key.split("/").pop()?.split("_")[0] })),
			},
		]);
	});

	it("counts sets by the variant names they hold, whatever order the keys were listed in", () => {
		const secondNested = [
			"japan-2025/kyoto/ginsui-sukiyaki-2/large_ginsui-sukiyaki-2.webp",
			"japan-2025/kyoto/ginsui-sukiyaki-2/thumbnail_ginsui-sukiyaki-2.webp",
			"japan-2025/kyoto/ginsui-sukiyaki-2/medium_ginsui-sukiyaki-2.webp",
		];

		const report = buildBackfillReport(objects([...NESTED_KEYS, ...HARBOUR_KEYS, ...secondNested]));

		expect(report.variantCombinations).toEqual([
			{ variants: ["large", "medium", "thumbnail"], count: 2 },
			{ variants: ["large", "medium", "original"], count: 1 },
		]);
	});

	it("lists every skipped key with the classifier's reason", () => {
		const report = buildBackfillReport(
			objects([
				...NESTED_KEYS,
				"japan-2025/",
				"japan-2025/raw-video/clip-1.mp4",
				"japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
				"src/japan-2025/a.jpg",
				"photo.webp",
			]),
		);

		expect(report.skipped).toEqual([
			{ key: "japan-2025/", reason: "folder-marker" },
			{ key: "japan-2025/raw-video/clip-1.mp4", reason: "not-webp" },
			{ key: "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json", reason: "set-manifest" },
			{ key: "src/japan-2025/a.jpg", reason: "reserved-prefix" },
			{ key: "photo.webp", reason: "no-set-folder" },
		]);
		expect(report.sets).toHaveLength(1);
		expect(report.sets[0].members.map(({ key }) => key)).toEqual(NESTED_KEYS);
	});

	it("lists the sets that lack a medium or a large variant, with the names they lack", () => {
		const noLarge = HARBOUR_KEYS.filter((key) => !key.includes("/large_"));
		const loneFile = "trips/lone/lone.webp";

		const report = buildBackfillReport(objects([...NESTED_KEYS, ...noLarge, loneFile]));

		expect(report.missingRequired).toEqual([
			{ folder: "trips", name: "harbour", missing: ["large"] },
			{ folder: "trips", name: "lone", missing: ["medium", "large"] },
		]);
	});

	it("lists the sets where two variant names share an ETag", () => {
		const [thumbnail, medium, large] = NESTED_KEYS;

		const report = buildBackfillReport(
			objects([...NESTED_KEYS, ...HARBOUR_KEYS], {
				[medium]: '"same-file"',
				[large]: '"same-file"',
				[thumbnail]: '"other"',
			}),
		);

		expect(report.sharedEtags).toEqual([
			{
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				etag: '"same-file"',
				variants: ["medium", "large"],
			},
		]);
	});

	it("does not treat missing ETags as a shared ETag", () => {
		const [thumbnail, medium, large] = NESTED_KEYS;

		const report = buildBackfillReport(objects(NESTED_KEYS, { [thumbnail]: "", [medium]: "", [large]: '"own"' }));

		expect(report.sharedEtags).toEqual([]);
	});

	it("does not report an ETag shared by two different sets", () => {
		const report = buildBackfillReport(
			objects([...NESTED_KEYS, ...HARBOUR_KEYS], { [NESTED_KEYS[0]]: '"same-file"', [HARBOUR_KEYS[0]]: '"same-file"' }),
		);

		expect(report.sharedEtags).toEqual([]);
	});

	it("lists sets with jpg, jpeg or png members apart, with how the classifier placed any webp beside them", () => {
		const report = buildBackfillReport(
			objects([
				...HARBOUR_KEYS,
				"trips/dusk/dusk.jpg",
				"trips/dusk/thumbnail_dusk.jpg",
				"trips/dusk/large_dusk.webp",
				"backups/db.tar.gz",
			]),
		);

		expect(report.nonWebpSets).toEqual([
			{
				folder: "trips",
				name: "dusk",
				members: [
					{ key: "trips/dusk/dusk.jpg", variant: "original" },
					{ key: "trips/dusk/thumbnail_dusk.jpg", variant: "thumbnail" },
				],
				webpSiblings: [
					{
						key: "trips/dusk/large_dusk.webp",
						variant: "large",
						classifiedAs: { name: "dusk", variant: "large" },
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
					"trips/harbour/medium_harbour.webp",
					"trips/harbour/large_harbour.webp",
					"trips/dusk/dusk.jpg",
					"trips/dusk/thumbnail_dusk.jpg",
					"trips/dusk/large_dusk.webp",
					"trips/harbour/manifest.json",
					"photo.webp",
				],
				{ [thumbnail]: '"t"', [medium]: '"same-file"', [large]: '"same-file"' },
			),
		);

		expect(formatBackfillReport(report)).toBe(
			[
				"Keys listed: 11",
				"",
				"Sets found: 3",
				"",
				"Sets by variant names",
				"  large+medium+thumbnail: 1",
				"  large+medium: 1",
				"  large: 1",
				"",
				"Skipped keys: 5",
				"  reserved-prefix: 0",
				"  folder-marker: 1",
				"  set-manifest: 1",
				"  not-webp: 2",
				"  empty-name: 0",
				"  no-set-folder: 1",
				"  [folder-marker] japan-2025/",
				"  [not-webp] trips/dusk/dusk.jpg",
				"  [not-webp] trips/dusk/thumbnail_dusk.jpg",
				"  [set-manifest] trips/harbour/manifest.json",
				"  [no-set-folder] photo.webp",
				"",
				"Sets where two variant names share an ETag: 1",
				'  japan-2025/kyoto/ginsui-sukiyaki-1: medium = large ("same-file")',
				"",
				"Sets missing medium or large: 1",
				"  trips/dusk: medium",
				"",
				"Sets with jpg/jpeg/png members: 1 (webp keys beside them: 1)",
				"  trips/dusk: original, thumbnail",
				'    trips/dusk/large_dusk.webp is classified as large of "dusk"',
			].join("\n"),
		);
	});
});

describe("assertImageSets", () => {
	it("passes when the keys form at least one set", () => {
		expect(() => assertImageSets(buildBackfillReport(objects(NESTED_KEYS)), "example-bucket")).not.toThrow();
	});

	it("fails, naming the scope and the key count, when keys exist but none form a set", () => {
		const report = buildBackfillReport(objects(["notes.txt", "photos/", "DSC_1.jpg"]));

		expect(() => assertImageSets(report, "example-bucket (folder docs)")).toThrow(
			"No image sets in example-bucket (folder docs): its 3 keys belong to none",
		);
	});
});
