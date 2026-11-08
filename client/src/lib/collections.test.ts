import { describe, expect, it } from "vitest";

import { coverOf, holdingSet, setsNotIn, setsToMove } from "~/shared/collections";
import type { CollectionsFile } from "~/shared/types";

const photo = { set: "trip/kyoto", alt: null, caption: null, tags: [] };
const file: CollectionsFile = {
	schema: 1,
	updatedAt: "",
	collections: [{ slug: "japan", name: "Japan", photos: [photo] }],
};

describe("holdingSet", () => {
	it("finds the collection and photo holding a set", () => {
		expect(holdingSet(file, "trip/kyoto")).toEqual({ collection: file.collections[0], photo });
	});

	it("is undefined for a set in no collection", () => {
		expect(holdingSet(file, "trip/osaka")).toBeUndefined();
		expect(holdingSet(undefined, "trip/kyoto")).toBeUndefined();
	});
});

describe("setsToMove", () => {
	it("lists sets held by a collection other than the target, or by any when the target is null", () => {
		const from = file.collections[0];
		expect(setsToMove(file, ["trip/kyoto", "trip/osaka"], "other")).toEqual([{ set: "trip/kyoto", from }]);
		expect(setsToMove(file, ["trip/kyoto"], null)).toEqual([{ set: "trip/kyoto", from }]);
	});

	it("skips sets already in the target", () => {
		expect(setsToMove(file, ["trip/kyoto"], "japan")).toEqual([]);
	});
});

describe("coverOf", () => {
	it("prefers the chosen cover, else the first photo", () => {
		const two = { ...file.collections[0], photos: [photo, { ...photo, set: "trip/osaka" }] };
		expect(coverOf({ ...two, cover: "trip/osaka" })).toBe("trip/osaka");
		expect(coverOf(two)).toBe("trip/kyoto");
	});
});

describe("setsNotIn", () => {
	it("drops sets the collection already holds", () => {
		expect(setsNotIn(file.collections[0], ["trip/kyoto", "trip/osaka"])).toEqual(["trip/osaka"]);
		expect(setsNotIn(file.collections[0], new Set(["trip/kyoto"]))).toEqual([]);
	});
});
