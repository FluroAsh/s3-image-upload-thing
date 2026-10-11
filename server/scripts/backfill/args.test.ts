import { describe, expect, it } from "vitest";

import { parseBackfillArgs } from "./args";

describe("parseBackfillArgs", () => {
	it("reads a dry run of one folder, without the folder's trailing slash", () => {
		expect(parseBackfillArgs(["--bucket", "example-bucket", "--prefix", "japan-2025/"])).toEqual({
			bucket: "example-bucket",
			folder: "japan-2025",
			region: undefined,
			write: false,
			force: false,
		});
	});

	it("reads a forced write run from the bucket alone, since manifests go where the sets are", () => {
		expect(
			parseBackfillArgs(["--bucket", "example-bucket", "--region", "ap-southeast-2", "--write", "--force"]),
		).toEqual({
			bucket: "example-bucket",
			folder: undefined,
			region: "ap-southeast-2",
			write: true,
			force: true,
		});
	});

	it.each([
		[["--prefix", "japan-2025"], "--bucket is required"],
		[["--bucket", "example-bucket", "--prefix", "/"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", ""], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", "/japan-2025"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--force"], "--force only applies with --write"],
		[["--bucket", "example-bucket", "--writ"], "Unknown option '--writ'"],
		[["--bucket", "example-bucket", "--manifest-bucket", "other-bucket"], "Unknown option '--manifest-bucket'"],
		[["--bucket", "example-bucket", "--path-prefix", "legacy/"], "Unknown option '--path-prefix'"],
	])("rejects %j: %s", (argv, message) => {
		expect(() => parseBackfillArgs(argv)).toThrow(message);
	});
});
