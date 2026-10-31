import { describe, expect, it } from "vitest";

import { linkToKey, planFlatSet, planFlatSets, refuseUnsafeSetFolder } from "./plan";

const member = (variant: string) => ({ variant, key: `photo/${variant}_photo.webp` });

describe("linkToKey", () => {
	it.each([
		[["placeholder", "small", "medium", "large", "full"], "photo/large_photo.webp"],
		[["placeholder", "small", "medium", "full"], "photo/medium_photo.webp"],
		[["placeholder", "small", "full"], "photo/small_photo.webp"],
		[["placeholder", "full"], null],
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
				mimeType: "image/webp",
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
			"blog/cat_ab12/full_cat_ab12.webp",
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

	it.each([
		["jpg", "image/jpeg"],
		["jpeg", "image/jpeg"],
		["png", "image/png"],
		["PNG", "image/png"],
	])("plans a flat set whose original is a .%s inside its own folder as a folder named without the extension", (extension, mimeType) => {
		const original = `images/spiderman_x.${extension}`;

		expect(planFlatSets([original, `images/small_spiderman_x.${extension}`])).toEqual([
			{
				layout: "flat",
				folder: "images",
				name: "spiderman_x",
				original,
				fileName: `spiderman_x.${extension}`,
				mimeType,
				setPrefix: "images/spiderman_x/",
				listedLinkTo: null,
				refusal: null,
			},
		]);
	});

	it("plans a webp original and a non-webp one side by side when their names differ", () => {
		const plans = planFlatSets(["a.webp", "small_a.webp", "b.jpg", "small_b.jpg"]);

		expect(plans.map(({ original, setPrefix, refusal }) => ({ original, setPrefix, refusal }))).toEqual([
			{ original: "a.webp", setPrefix: "a/", refusal: null },
			{ original: "b.jpg", setPrefix: "b/", refusal: null },
		]);
	});

	it("refuses the second of two originals that share a set folder, naming both, so neither overwrites or merges into the other", () => {
		const plans = planFlatSets(["x.webp", "small_x.webp", "x.jpg", "x.png"]);

		expect(plans.map(({ original, refusal }) => ({ original, refusal }))).toEqual([
			{ original: "x.webp", refusal: null },
			{
				original: "x.jpg",
				refusal: {
					outcome: "unsafe-target",
					detail: '"x.jpg" and "x.webp" would both be stored in "x/"; only the first is migrated',
				},
			},
			{
				original: "x.png",
				refusal: {
					outcome: "unsafe-target",
					detail: '"x.png" and "x.webp" would both be stored in "x/"; only the first is migrated',
				},
			},
		]);
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

		expect(planFlatSet(set, null, [set])).toMatchObject({
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
