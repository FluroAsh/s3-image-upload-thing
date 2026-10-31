import { describe, expect, it } from "vitest";

import type { TreeNode } from "~/shared/types";

import { pickPreviewVariant } from "./utils";

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
	it("prefers large over every other variant", () => {
		expect(pick("placeholder_a.webp", "full_a.webp", "large_a.webp", "small_a.webp")).toBe("large_a.webp");
	});

	it("falls from large to medium to small", () => {
		expect(pick("placeholder_a.webp", "small_a.webp", "medium_a.webp", "full_a.webp")).toBe("medium_a.webp");
		expect(pick("placeholder_a.webp", "small_a.webp", "full_a.webp")).toBe("small_a.webp");
	});

	it("falls back to full when no sized variant exists", () => {
		expect(pick("placeholder_a.webp", "full_a.webp")).toBe("full_a.webp");
	});

	it("uses the placeholder only when nothing else exists", () => {
		expect(pick("placeholder_a.webp")).toBe("placeholder_a.webp");
	});

	it("returns nothing for a set with no known variant", () => {
		expect(pick("notes.txt")).toBeUndefined();
	});
});
