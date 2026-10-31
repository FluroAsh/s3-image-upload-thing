import { describe, expect, it } from "vitest";

import { linkToKey, planFlatSet, planFlatSets, refuseUnsafeSetFolder } from "./plan";

const member = (variant: string) => ({ variant, key: `photo/${variant}_photo.webp` });

describe("linkToKey", () => {
	it.each([
		[["placeholder", "small", "medium", "large", "lossless"], "photo/large_photo.webp"],
		[["placeholder", "small", "medium", "lossless"], "photo/medium_photo.webp"],
		[["placeholder", "lossless"], "photo/lossless_photo.webp"],
		[["placeholder"], null],
	])("of a set holding %j is %s", (variants, expected) => {
		expect(linkToKey(variants.map(member))).toBe(expected);
	});
});

const FLAT_KEYS = [
	"DSC_1963_f6f8bf29c4.webp",
	"thumbnail_DSC_1963_f6f8bf29c4.webp",
	"small_DSC_1963_f6f8bf29c4.webp",
	"medium_DSC_1963_f6f8bf29c4.webp",
	"large_DSC_1963_f6f8bf29c4.webp",
];

describe("planFlatSets", () => {
	it("plans a set folder at the bucket root, named after the flat original, and leaves nested sets alone", () => {
		expect(planFlatSets([...FLAT_KEYS, "trip/photo/large_photo.webp", "notes.txt"])).toEqual([
			{
				layout: "flat",
				folder: "",
				name: "DSC_1963_f6f8bf29c4",
				original: "DSC_1963_f6f8bf29c4.webp",
				fileName: "DSC_1963_f6f8bf29c4.webp",
				setPrefix: "DSC_1963_f6f8bf29c4/",
				listedLinkTo: null,
				refusal: null,
			},
		]);
	});

	it("plans the folder inside the flat set's own folder, and finds the key to link to when the folder is already listed", () => {
		const [plan] = planFlatSets([
			"blog/cat_ab12.webp",
			"blog/small_cat_ab12.webp",
			"blog/cat_ab12/placeholder_cat_ab12.webp",
			"blog/cat_ab12/medium_cat_ab12.webp",
			"blog/cat_ab12/lossless_cat_ab12.webp",
			"blog/cat_ab12/manifest.json",
		]);

		expect(plan).toMatchObject({
			folder: "blog",
			original: "blog/cat_ab12.webp",
			fileName: "cat_ab12.webp",
			setPrefix: "blog/cat_ab12/",
			listedLinkTo: "blog/cat_ab12/medium_cat_ab12.webp",
		});
	});

	it("refuses a set whose folder would sit under a path uploads are refused for", () => {
		const [plan] = planFlatSets(["legacy/cat_ab12.webp", "legacy/small_cat_ab12.webp"]);

		expect(plan.refusal).toEqual({
			outcome: "reserved",
			detail: 'uploads are refused under "legacy/cat_ab12/"',
		});
	});

	it("refuses a set whose folder already holds another flat set, and still plans that other set", () => {
		const plans = planFlatSets(["cat_ab12.webp", "small_cat_ab12.webp", "cat_ab12/dog_cd34.webp"]);

		expect(plans.map(({ name, setPrefix, refusal }) => ({ name, setPrefix, refusal }))).toEqual([
			{
				name: "cat_ab12",
				setPrefix: "cat_ab12/",
				refusal: {
					outcome: "unsafe-target",
					detail: 'flat file "cat_ab12/dog_cd34.webp" is inside "cat_ab12/", where the new set would be stored',
				},
			},
			{ name: "dog_cd34", setPrefix: "cat_ab12/dog_cd34/", refusal: null },
		]);
	});
});

describe("planFlatSet", () => {
	it("refuses a set that has no un-prefixed file, since there is nothing to make the sizes from", () => {
		const set = {
			layout: "flat" as const,
			folder: "",
			name: "cat_ab12",
			members: [{ key: "small_cat_ab12.webp", variant: "small" }],
		};

		expect(planFlatSet(set, [set])).toMatchObject({
			original: null,
			refusal: { outcome: "no-original", detail: "it has no un-prefixed file to make the sizes from" },
		});
	});
});

describe("refuseUnsafeSetFolder", () => {
	const set = { folder: "blog", name: "cat_ab12" };
	const flatKeys = ["blog/cat_ab12.webp", "blog/small_cat_ab12.webp"];

	it("returns nothing for the set's own folder when no flat file is inside it", () => {
		expect(refuseUnsafeSetFolder("blog/cat_ab12/", set, flatKeys)).toBeUndefined();
	});

	it.each([
		"",
		"blog/",
		"blog/cat_ab12",
		"cat_ab12/",
		"blog/small_cat_ab12/",
	])("refuses %j, which is not the set's own folder", (prefix) => {
		expect(refuseUnsafeSetFolder(prefix, set, flatKeys)).toContain('is not the set folder "blog/cat_ab12/"');
	});

	it("refuses a folder that already holds a flat file, which a put could then replace", () => {
		expect(refuseUnsafeSetFolder("blog/cat_ab12/", set, [...flatKeys, "blog/cat_ab12/dog_cd34.webp"])).toContain(
			'flat file "blog/cat_ab12/dog_cd34.webp" is inside "blog/cat_ab12/"',
		);
	});
});
