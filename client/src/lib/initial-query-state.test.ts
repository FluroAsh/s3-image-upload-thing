import { describe, expect, it } from "vitest";

import { getInitialQueryState } from "./initial-query-state";

const data = {
	buckets: [
		{ Name: "a", BucketRegion: "us-east-1" },
		{ Name: "b", BucketRegion: "ap-southeast-2" },
	],
} as Parameters<typeof getInitialQueryState>[0];

describe("getInitialQueryState", () => {
	it("keeps a matching bucket/region pair", () => {
		expect(getInitialQueryState(data, "b", "ap-southeast-2")).toEqual({
			activeBucket: "b",
			activeRegion: "ap-southeast-2",
		});
	});

	it("falls back to the first bucket when the region does not match", () => {
		expect(getInitialQueryState(data, "b", "us-east-1")).toEqual({
			activeBucket: "a",
			activeRegion: "us-east-1",
		});
	});

	it("falls back to the pinned bucket when none is requested or the request is unknown", () => {
		const pinned = { ...data, pinnedBucket: "b" };
		const expected = { activeBucket: "b", activeRegion: "ap-southeast-2" };

		expect(getInitialQueryState(pinned, "", "")).toEqual(expected);
		expect(getInitialQueryState(pinned, "missing", "us-east-1")).toEqual(expected);
	});

	it("still opens the requested bucket when another is pinned", () => {
		expect(getInitialQueryState({ ...data, pinnedBucket: "b" }, "a", "us-east-1")).toEqual({
			activeBucket: "a",
			activeRegion: "us-east-1",
		});
	});

	it("falls back to the first bucket when the pinned bucket no longer exists", () => {
		expect(getInitialQueryState({ ...data, pinnedBucket: "gone" }, "", "")).toEqual({
			activeBucket: "a",
			activeRegion: "us-east-1",
		});
	});
});
