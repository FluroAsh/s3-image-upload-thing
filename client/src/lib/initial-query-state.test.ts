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
});
