import { describe, expect, it } from "vitest";

import type { ApiError } from "@/lib/ofetch";
import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";
import type { TreeNode } from "~/shared/types";

import { formatCount, formatSize, PREVIEW_ORDER, pickPreviewVariant, serverErrorMessage } from "./utils";

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
	])("pluralises a complete count of %i", (count, expected) => {
		expect(formatCount(count, "file", false)).toBe(expected);
	});

	it("says a partial count is a lower bound", () => {
		expect(formatCount(1, "file", true)).toBe("at least 1 file");
		expect(formatCount(2, "file", true)).toBe("at least 2 files");
	});

	it("leaves the noun off when none is given", () => {
		expect(formatCount(5237, undefined, true)).toBe("at least 5237");
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
