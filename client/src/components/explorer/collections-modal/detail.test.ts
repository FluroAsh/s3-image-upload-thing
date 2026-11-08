import { describe, expect, it } from "vitest";

import type { Collection } from "~/shared/types";

import { coverOf, reorderSets } from "./detail";

const photo = (set: string) => ({ set, alt: null, caption: null, tags: [] });
const collection = (set: string[], cover?: string): Collection => ({
	slug: "c",
	name: "C",
	cover,
	photos: set.map(photo),
});

describe("coverOf", () => {
	it("prefers the chosen cover, else the first photo", () => {
		expect(coverOf(collection(["a", "b"], "b"))).toBe("b");
		expect(coverOf(collection(["a", "b"]))).toBe("a");
	});
});

describe("reorderSets", () => {
	it("moves forward and backward", () => {
		expect(reorderSets(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
		expect(reorderSets(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
	});
	it("does not mutate the input", () => {
		const sets = ["a", "b"];
		reorderSets(sets, 0, 1);
		expect(sets).toEqual(["a", "b"]);
	});
});
