import { describe, expect, it } from "vitest";

import { mapLimited, type Unfinished } from "./map-limited";

describe("mapLimited", () => {
	it("keeps the order of the items whatever order they finish in", async () => {
		const results = await mapLimited([30, 10, 20], 2, async (delay) => {
			await new Promise((resolve) => setTimeout(resolve, delay));
			return delay * 2;
		});

		expect(results).toEqual([60, 20, 40]);
	});

	it("tracks every item as unfinished, including ones not yet started, until it settles", async () => {
		const items = new Set<string>();
		const unfinished: Unfinished<string> = { total: 0, items };
		const seen: string[][] = [];

		await mapLimited(
			["a", "b", "c"],
			1,
			async (item) => {
				seen.push(Array.from(items));
				return item;
			},
			unfinished,
		);

		expect(seen).toEqual([["a", "b", "c"], ["b", "c"], ["c"]]);
		expect(unfinished.total).toBe(3);
		expect(items.size).toBe(0);
	});
});
