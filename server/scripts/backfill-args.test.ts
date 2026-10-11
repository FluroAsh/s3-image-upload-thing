import { describe, expect, it } from "vitest";

import { parseBackfillArgs } from "./backfill-args";

describe("parseBackfillArgs", () => {
	it("reads a dry run of one folder, without the folder's trailing slash", () => {
		expect(parseBackfillArgs(["--bucket", "example-bucket", "--prefix", "japan-2025/"])).toEqual({
			bucket: "example-bucket",
			manifestBucket: undefined,
			pathPrefix: "",
			folder: "japan-2025",
			region: undefined,
			write: false,
		});
	});

	it("reads a forced write run for the second bucket", () => {
		expect(
			parseBackfillArgs([
				"--bucket",
				"example-legacy-bucket",
				"--manifest-bucket",
				"example-bucket",
				"--path-prefix",
				"legacy/",
				"--region",
				"ap-southeast-2",
				"--write",
				"--force",
			]),
		).toEqual({
			bucket: "example-legacy-bucket",
			manifestBucket: "example-bucket",
			pathPrefix: "legacy/",
			folder: undefined,
			region: "ap-southeast-2",
			write: true,
			force: true,
		});
	});

	it("accepts an explicitly empty path prefix for a write run, into the bucket it reads", () => {
		const args = ["--bucket", "example-bucket", "--manifest-bucket", "example-bucket", "--write", "--path-prefix", ""];

		expect(parseBackfillArgs(args)).toMatchObject({ write: true, pathPrefix: "", force: false });
	});

	it.each([
		[["--prefix", "japan-2025"], "--bucket is required"],
		[["--bucket", "example-bucket", "--prefix", "/"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", ""], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", "/japan-2025"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--write", "--path-prefix", ""], "--write needs --manifest-bucket"],
		[["--bucket", "example-bucket", "--write", "--manifest-bucket", "example-bucket"], "--write needs --path-prefix"],
		[["--bucket", "example-bucket", "--force"], "--force only applies with --write"],
		[["--bucket", "example-bucket", "--writ"], "Unknown option '--writ'"],
	])("rejects %j: %s", (argv, message) => {
		expect(() => parseBackfillArgs(argv)).toThrow(message);
	});

	it.each([
		"/",
		"/legacy/",
		"legacy",
		"legacy//",
		"./",
		"../",
		"legacy/../",
		"my legacy/",
	])("rejects the path prefix %j, whether or not it writes", (pathPrefix) => {
		expect(() => parseBackfillArgs(["--bucket", "example-bucket", "--path-prefix", pathPrefix])).toThrow("pathPrefix");
	});

	it("refuses to write a second bucket's manifests into the bucket it reads", () => {
		const args = [
			"--bucket",
			"example-bucket",
			"--manifest-bucket",
			"example-bucket",
			"--path-prefix",
			"legacy/",
			"--write",
		];

		expect(() => parseBackfillArgs(args)).toThrow("different bucket");
	});

	it("allows the same bucket on a dry run with a path prefix, which writes nothing", () => {
		const args = ["--bucket", "example-bucket", "--manifest-bucket", "example-bucket", "--path-prefix", "legacy/"];

		expect(parseBackfillArgs(args)).toMatchObject({ write: false, pathPrefix: "legacy/" });
	});
});
