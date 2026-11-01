import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Bucket } from "~/shared/types";

import { s3 } from "../fake-s3";
import { REQUEST_TIMEOUT_MS } from "../services/s3-operations";
import { listBucketsHandler } from "./list-buckets";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const get = () => new Hono().get("/buckets", listBucketsHandler).request("/buckets");

beforeEach(() => {
	s3.sent.length = 0;
	s3.options.length = 0;
});

afterEach(() => vi.useRealTimers());

describe("listBucketsHandler", () => {
	it("answers with an error naming the deadline when the bucket list never answers", async () => {
		vi.useFakeTimers();
		s3.respond = () => new Promise(() => {});

		const response = get();
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		const res = await response;

		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: `S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` });
	});

	it("marks a bucket and the totals as partial when that bucket's stats stop early", async () => {
		s3.respond = async ({ command, input }) => {
			if (command === "ListBuckets") {
				return {
					Buckets: [
						{ Name: "complete", BucketRegion: "us-east-1" },
						{ Name: "refused", BucketRegion: "us-east-1" },
					],
				};
			}
			if (input.Bucket === "refused") throw new Error("Access Denied");
			return { Contents: [{ Key: "a.webp", Size: 5 }] };
		};

		const body = await (await get()).json();

		expect(body.buckets.map(({ Name, objectCount, partial }: Bucket) => ({ Name, objectCount, partial }))).toEqual([
			{ Name: "complete", objectCount: 1, partial: false },
			{ Name: "refused", objectCount: 0, partial: true },
		]);
		expect(body).toMatchObject({ totalObjectCount: 1, partial: true });
	});
});
