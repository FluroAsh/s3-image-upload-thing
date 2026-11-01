import { beforeEach, describe, expect, it, vi } from "vitest";

import ofetch from "@/lib/ofetch";

import { getBuckets, getFileTree } from "./s3";

vi.mock("@/lib/ofetch", () => ({ default: vi.fn() }));

beforeEach(() => vi.mocked(ofetch).mockResolvedValue({ tree: [] }));

// The server answers a stalled listing with a 500 after its own 60s deadline; a retry would multiply that wait.
describe("listing requests", () => {
	it("do not retry", async () => {
		await getBuckets();
		await getFileTree("example-bucket", "us-east-1");

		for (const [, options] of vi.mocked(ofetch).mock.calls) expect(options).toMatchObject({ retry: 0 });
		expect(ofetch).toHaveBeenCalledTimes(2);
	});
});
