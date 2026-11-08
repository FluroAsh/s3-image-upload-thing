import { describe, expect, it } from "vitest";

import { reorderSets } from "./collection-order";

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
