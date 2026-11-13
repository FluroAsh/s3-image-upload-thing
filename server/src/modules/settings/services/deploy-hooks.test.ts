import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEBOUNCE_MS, deployBucket, isPending, lastResultOf, markBucketChanged } from "./deploy-hooks";

const settings = vi.hoisted(() => ({ hooks: [] as { id: string; name: string; url: string }[] }));

vi.mock("./settings-store", () => ({
	readSettings: async () => ({ buckets: { b: { hooks: settings.hooks } } }),
	hooksOf: (all: { buckets: Record<string, { hooks: unknown[] }> }, bucket: string) => all.buckets[bucket]?.hooks ?? [],
}));

const fetchMock = vi.fn();

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockResolvedValue({ status: 200 });
	settings.hooks = [{ id: "1", name: "Site", url: "https://example.com/secret-path" }];
});

afterEach(async () => {
	await deployBucket("b");
	fetchMock.mockReset();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("deploy debounce", () => {
	it("fires once, two minutes after the last of several writes", async () => {
		await markBucketChanged("b");
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1000);
		await markBucketChanged("b");
		await markBucketChanged("b");
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1000);
		expect(fetchMock).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/secret-path",
			expect.objectContaining({ method: "POST" }),
		);
		expect(isPending("b")).toBe(false);
	});

	it("reports pending until the deploy fires", async () => {
		await markBucketChanged("b");

		expect(isPending("b")).toBe(true);
	});

	it("does nothing for a bucket without hooks", async () => {
		settings.hooks = [];

		await markBucketChanged("b");

		expect(isPending("b")).toBe(false);
	});

	it("deploys at once and cancels the pending timer", async () => {
		await markBucketChanged("b");

		const results = await deployBucket("b");
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

		expect(results).toEqual([{ id: "1", name: "Site", result: { at: expect.any(String), status: 200 } }]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(isPending("b")).toBe(false);
	});

	it("records a failed call as status 0 and logs without the URL", async () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		fetchMock.mockRejectedValue(new Error("connect to https://example.com/secret-path failed"));

		const [{ result }] = await deployBucket("b");

		expect(result.status).toBe(0);
		expect(JSON.stringify(log.mock.calls)).not.toContain("secret-path");
		log.mockRestore();
	});

	it("stays pending until the hooks answer, then clears", async () => {
		let answer: (response: { status: number }) => void = () => {};
		fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		await markBucketChanged("b");

		const deploying = deployBucket("b");
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

		expect(isPending("b")).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		answer({ status: 200 });
		await deploying;

		expect(isPending("b")).toBe(false);
		expect(lastResultOf("1")?.status).toBe(200);
	});

	it("keeps a countdown started while a deploy is in flight", async () => {
		let answer: (response: { status: number }) => void = () => {};
		fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		await markBucketChanged("b");

		const deploying = deployBucket("b");
		await markBucketChanged("b");
		answer({ status: 200 });
		await deploying;

		expect(isPending("b")).toBe(true);
	});
});
