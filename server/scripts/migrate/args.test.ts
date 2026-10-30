import { describe, expect, it } from "vitest";

import { parseMigrateArgs } from "./args";

describe("parseMigrateArgs", () => {
	it("reads a dry run of one folder, writing the mapping to the current directory", () => {
		expect(parseMigrateArgs(["--bucket", "example-bucket", "--prefix", "blog/"])).toEqual({
			bucket: "example-bucket",
			folder: "blog",
			region: undefined,
			write: false,
			map: "flat-set-mapping.json",
			limit: undefined,
		});
	});

	it("reads a limited write run with its own mapping file", () => {
		expect(
			parseMigrateArgs(["--bucket", "example-bucket", "--write", "--limit", "3", "--map", "/tmp/trial.json"]),
		).toMatchObject({ write: true, limit: 3, map: "/tmp/trial.json" });
	});

	it.each([
		[["--write"], "--bucket is required"],
		[["--bucket", "example-bucket", "--prefix", "/"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--write", "--limit", "0"], "--limit must be a whole number above 0"],
		[["--bucket", "example-bucket", "--write", "--limit", "two"], "--limit must be a whole number above 0"],
		[["--bucket", "example-bucket", "--limit", "1"], "--limit only applies with --write"],
		[["--bucket", "example-bucket", "--force"], "Unknown option '--force'"],
	])("rejects %j: %s", (argv, message) => {
		expect(() => parseMigrateArgs(argv)).toThrow(message);
	});
});
