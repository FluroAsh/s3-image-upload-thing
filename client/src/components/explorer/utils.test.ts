import { describe, expect, it } from "vitest";

import type { ApiError } from "@/lib/ofetch";
import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";
import type { TreeNode } from "~/shared/types";

import {
	fileType,
	filterNeedle,
	formatCount,
	formatSize,
	matchesFilter,
	PREVIEW_ORDER,
	pickedInTreeOrder,
	pickPreviewVariant,
	placeBesideCursor,
	serverErrorMessage,
	setFoldersIn,
	setFoldersUnder,
	setPathOf,
	setsUnder,
	toggleSets,
	variantOf,
} from "./utils";

const node = (name: string): TreeNode => ({
	id: `set/${name}`,
	parentId: "set",
	name,
	depth: 1,
	isFolder: false,
	childCount: 0,
});

const pick = (...names: string[]) => pickPreviewVariant(names.map(node))?.name;

describe("pickPreviewVariant", () => {
	it("considers every size exactly once", () => {
		expect(PREVIEW_ORDER.toSorted()).toEqual(IMAGE_VARIANTS.toSorted());
	});

	it("prefers large over every other variant", () => {
		expect(pick("placeholder_a.webp", "thumbnail_a.webp", "full_a.webp", "large_a.webp", "small_a.webp")).toBe(
			"large_a.webp",
		);
	});

	it("falls from large to medium to small", () => {
		expect(pick("placeholder_a.webp", "small_a.webp", "medium_a.webp", "full_a.webp")).toBe("medium_a.webp");
		expect(pick("placeholder_a.webp", "small_a.webp", "full_a.webp")).toBe("small_a.webp");
	});

	it("falls back to full when no inline size exists", () => {
		expect(pick("placeholder_a.webp", "thumbnail_a.webp", "full_a.webp")).toBe("full_a.webp");
	});

	it("prefers the sharp thumbnail over the blurred placeholder when no larger size exists", () => {
		expect(pick("placeholder_a.webp", "thumbnail_a.webp")).toBe("thumbnail_a.webp");
	});

	it("uses the placeholder only when nothing else exists", () => {
		expect(pick("placeholder_a.webp")).toBe("placeholder_a.webp");
	});

	it("returns nothing for a set with no known variant", () => {
		expect(pick("notes.txt")).toBeUndefined();
	});
});

describe("formatCount", () => {
	it.each([
		[0, "0 files"],
		[1, "1 file"],
		[2, "2 files"],
		[1848, "1,848 files"],
	])("pluralises a complete count of %i", (count, expected) => {
		expect(formatCount(count, "file", false)).toBe(expected);
	});

	it("says a partial count is a lower bound", () => {
		expect(formatCount(1, "file", true)).toBe("at least 1 file");
		expect(formatCount(2, "file", true)).toBe("at least 2 files");
	});

	it("leaves the noun off when none is given", () => {
		expect(formatCount(5237, undefined, true)).toBe("at least 5,237");
	});

	it("says unknown for a count that never ran, partial or not", () => {
		expect(formatCount(undefined, "file", true)).toBe("unknown");
		expect(formatCount(undefined, "file", false)).toBe("unknown");
	});
});

describe("formatSize", () => {
	it("says a partial size is a lower bound", () => {
		expect(formatSize("113.09 kB", true)).toBe("at least 113.09 kB");
	});

	it("leaves a complete size as it is", () => {
		expect(formatSize("113.09 kB", false)).toBe("113.09 kB");
	});

	it("says unknown for a size that never ran", () => {
		expect(formatSize(undefined, true)).toBe("unknown");
	});
});

describe("serverErrorMessage", () => {
	it("shows the message the server sent", () => {
		const error = Object.assign(new Error("[GET] /x: 500"), {
			data: { error: "S3 request timed out after 60s" },
		}) as ApiError;
		expect(serverErrorMessage(error, "Something went wrong")).toBe("S3 request timed out after 60s");
	});

	it("falls back when the server sent none", () => {
		expect(serverErrorMessage(new Error("[GET] /x: 500") as ApiError, "Something went wrong")).toBe(
			"Something went wrong",
		);
	});
});

describe("setPathOf", () => {
	it("drops the set folder's trailing slash", () => {
		expect(setPathOf("trip/kyoto/")).toBe("trip/kyoto");
	});
});

const dir = (id: string, depth: number): TreeNode => ({
	id,
	parentId: id.replace(/[^/]+\/$/, ""),
	name: id.split("/").at(-2) ?? "",
	depth,
	isFolder: true,
	childCount: 1,
});
const file = (parent: string, name: string): TreeNode => ({ ...node(name), id: `${parent}${name}`, parentId: parent });

const tree = [
	dir("trip/", 0),
	dir("trip/kyoto/", 1),
	file("trip/kyoto/", "large_kyoto.webp"),
	dir("trip/osaka/", 1),
	file("trip/osaka/", "large_osaka.webp"),
	dir("misc/", 0),
	file("misc/", "notes.txt"),
];
const childMap = new Map<string, TreeNode[]>();
for (const n of tree) childMap.set(n.parentId, [...(childMap.get(n.parentId) ?? []), n]);

describe("setFoldersUnder", () => {
	it("finds set folders at any depth and skips plain folders", () => {
		expect(setFoldersUnder(childMap, "").map((f) => f.id)).toEqual(["trip/kyoto/", "trip/osaka/"]);
		expect(setFoldersUnder(childMap, "trip/kyoto/").map((f) => f.id)).toEqual([]);
	});
});

describe("setFoldersIn", () => {
	it("lists only set folders directly inside the folder", () => {
		expect(setFoldersIn(childMap, "trip/").map((f) => f.id)).toEqual(["trip/kyoto/", "trip/osaka/"]);
		expect(setFoldersIn(childMap, "").map((f) => f.id)).toEqual([]);
	});
});

describe("set picker selection", () => {
	const folder = (id: string): TreeNode => ({ ...node("x"), id, isFolder: true });
	const sets = new Map([
		["cdn/trip/kyoto", folder("trip/kyoto/")],
		["cdn/trip/osaka", folder("trip/osaka/")],
		["cdn/solo", folder("solo/")],
	]);

	it("takes every set under a folder", () => {
		expect(setsUnder(sets, "trip/")).toEqual(["cdn/trip/kyoto", "cdn/trip/osaka"]);
	});

	it("takes every set for the bucket root", () => {
		expect(setsUnder(sets, "")).toEqual(["cdn/trip/kyoto", "cdn/trip/osaka", "cdn/solo"]);
	});

	it("lists picked sets in tree order, not the order they were ticked", () => {
		const picked = new Set(["cdn/solo", "cdn/trip/kyoto", "cdn/gone"]);
		expect(pickedInTreeOrder(sets, picked).map(([set]) => set)).toEqual(["cdn/trip/kyoto", "cdn/solo"]);
	});

	it("ticks a partly ticked group, then clears it once whole", () => {
		const group = setsUnder(sets, "trip/");
		const whole = toggleSets(new Set(["cdn/trip/kyoto"]), group);
		expect([...whole]).toEqual(["cdn/trip/kyoto", "cdn/trip/osaka"]);
		expect(toggleSets(whole, group).size).toBe(0);
	});
});

describe("variantOf", () => {
	it("names the size a file is stored as", () => {
		expect(variantOf("small_photo.webp")).toBe("small");
		expect(variantOf("legacy_name.jpg")).toBe("legacy");
	});
});

describe("fileType", () => {
	it("names the type from the extension", () => {
		expect(fileType("photo.JPG")).toBe("JPG");
		expect(fileType("notes")).toBe("unknown");
	});
});

describe("matchesFilter", () => {
	it("ignores case and surrounding spaces, and matches everything when empty", () => {
		const needle = filterNeedle("  FoO ");
		expect(matchesFilter("a-foo-b", needle)).toBe(true);
		expect(matchesFilter("bar", needle)).toBe(false);
		expect(matchesFilter("bar", filterNeedle("  "))).toBe(true);
	});
});

describe("placeBesideCursor", () => {
	const box = { width: 100, height: 50 };
	const viewport = { width: 500, height: 400 };

	it("sits below and right of the cursor", () => {
		expect(placeBesideCursor({ x: 10, y: 20 }, box, viewport)).toEqual({ x: 26, y: 36 });
	});

	it("flips to the left and above near the far edges", () => {
		expect(placeBesideCursor({ x: 450, y: 380 }, box, viewport)).toEqual({ x: 334, y: 314 });
	});
});
