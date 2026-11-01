import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../fake-s3";
import { REQUEST_TIMEOUT_MS } from "../services/s3-operations";
import { getBucketHandler } from "./get-bucket";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const get = () =>
	new Hono().get("/buckets/:bucketName", getBucketHandler).request("/buckets/example-bucket?region=us-east-1");

afterEach(() => vi.useRealTimers());

describe("getBucketHandler", () => {
	it("answers an empty bucket with an empty tree, so the UI can tell it apart from a failed listing", async () => {
		s3.respond = async () => ({});

		const res = await get();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ tree: [] });
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
