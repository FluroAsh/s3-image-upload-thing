import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../fake-s3";
import { REQUEST_TIMEOUT_MS } from "../services/s3-operations";
import { getBucketHandler } from "./get-bucket";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const get = () =>
	new Hono().get("/buckets/:bucketName", getBucketHandler).request("/buckets/example-bucket?region=us-east-1");

afterEach(() => vi.useRealTimers());

/** Answers ListObjectsV2 the way S3 does: at most 1,000 keys a page, the next page behind a continuation token. */
const respondWithKeys = (keys: string[]) => {
	s3.respond = async ({ command, input }) => {
		if (command !== "ListObjectsV2") throw new Error(`Unexpected ${command}`);
		const start = Number(input.ContinuationToken ?? 0);
		const end = start + 1000;
		return {
			Contents: keys.slice(start, end).map((Key) => ({ Key, Size: 1 })),
			IsTruncated: end < keys.length,
			NextContinuationToken: end < keys.length ? String(end) : undefined,
		};
	};
};

describe("getBucketHandler", () => {
	it("answers an empty bucket with an empty tree, so the UI can tell it apart from a failed listing", async () => {
		s3.respond = async () => ({});

		const res = await get();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ tree: [], partial: false });
	});

	it("lists every key of a folder with more than one page of keys", async () => {
		const keys = Array.from({ length: 2500 }, (_, i) => `trip/photo-${i}.webp`);
		respondWithKeys(keys);

		const res = await get();
		const { tree } = await res.json();

		expect(res.status).toBe(200);
		expect(tree).toHaveLength(2501);
		expect(new Set(tree.map(({ id }: { id: string }) => id))).toEqual(new Set(["trip/", ...keys]));
	});

	it("answers with the keys listed so far, marked partial, once pages that each beat the deadline pass it in total", async () => {
		vi.useFakeTimers();
		let page = 0;
		s3.respond = () =>
			new Promise((resolve) => {
				page += 1;
				const Key = `trip/photo-${page}.webp`;
				setTimeout(
					() => resolve({ Contents: [{ Key }], IsTruncated: true, NextContinuationToken: Key }),
					REQUEST_TIMEOUT_MS * 0.4,
				);
			});

		const response = get();
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);
		const { tree, partial } = await (await response).json();

		expect(partial).toBe(true);
		expect(tree.map(({ id }: { id: string }) => id)).toEqual([
			"trip/",
			"trip/photo-1.webp",
			"trip/photo-2.webp",
			"trip/photo-3.webp",
		]);
	});

	it("answers with an error naming the deadline when the folder listing never answers", async () => {
		vi.useFakeTimers();
		s3.respond = () => new Promise(() => {});

		const response = get();
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		const res = await response;

		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: `S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` });
	});
});
