import { describe, expect, it, vi } from "vitest";

import { parseMigrateArgs } from "./args";

// The real module throws at import without AWS credentials; only its default region matters here.
vi.mock("@/modules/storage/services/s3-operations", () => ({ defaultRegion: "us-default-1" }));

describe("parseMigrateArgs", () => {
	it("reads a dry run of one folder, writing the mapping to the current directory", () => {
		expect(parseMigrateArgs(["--bucket", "example-bucket", "--prefix", "blog/"])).toEqual({
			location: { bucketName: "example-bucket", bucketRegion: "us-default-1" },
			folder: "blog",
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
