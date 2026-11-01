import { spawn } from "node:child_process";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../fake-s3";
import { buildManifest, NotAManifestError } from "./manifest";
import {
	imageSetExists,
	REQUEST_TIMEOUT_MS,
	readManifest,
	readObject,
	storeManifest,
	storeOriginal,
} from "./s3-operations";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const LOCATION = { bucketName: "example-bucket", bucketRegion: "us-east-1" };

const MANIFEST = buildManifest({
	createdAt: "2026-10-11T00:00:00.000Z",
	placeholder: null,
	source: null,
	objects: [
		{
			key: "japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
			width: 800,
			height: 400,
			bytes: 1234,
			etag: '"abc"',
		},
	],
});

const bodyOf = (content: string | Buffer) => ({
	Body: {
		transformToString: async () => String(content),
		transformToByteArray: async () => new Uint8Array(Buffer.from(content)),
	},
});

/** Answers requests the way the SDK does once aborted, with no response before then. */
const respondOnlyToAbort = () => {
	s3.respond = (_sent, options) =>
		new Promise((_, reject) =>
			options?.abortSignal?.addEventListener("abort", () =>
				reject(Object.assign(new Error("Request aborted"), { name: "AbortError" })),
			),
		);
};

beforeEach(() => {
	s3.sent.length = 0;
	s3.options.length = 0;
	s3.respond = s3.defaultRespond;
});

describe("storeManifest", () => {
	it("replaces an existing manifest when forced, by sending no create-only condition", async () => {
		await expect(storeManifest(MANIFEST, LOCATION, { force: true })).resolves.toBe(true);

		expect(s3.sent).toHaveLength(1);
		expect(s3.sent[0].input).toMatchObject({
			Bucket: "example-bucket",
			Key: "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
			ContentType: "application/json",
			CacheControl: "public, max-age=300",
		});
		expect(s3.sent[0].input.IfNoneMatch).toBeUndefined();
	});
});

describe("storeOriginal", () => {
	it("copies from another key server side, create-only, with the source key URL-encoded per segment", async () => {
		const stored = storeOriginal(
			{ key: "trip/a b/original.jpg", copyFrom: "trip/a b+c.jpg", ifMatch: '"v1"' },
			LOCATION,
		);

		await expect(stored).resolves.toBe(true);
		expect(s3.sent).toEqual([
			{
				command: "CopyObject",
				input: {
					Bucket: "example-bucket",
					Key: "trip/a b/original.jpg",
					CopySource: "example-bucket/trip/a%20b%2Bc.jpg",
					CopySourceIfMatch: '"v1"',
					IfNoneMatch: "*",
				},
			},
		]);
	});
});

describe("storeOriginal copy preconditions", () => {
	const copy = { key: "trip/photo/original.jpg", copyFrom: "trip/photo.jpg", ifMatch: '"v1"' };
	const refuse = (listed: string[]) => {
		s3.respond = async (sent) => {
			if (sent.command === "ListObjectsV2") return { Contents: listed.map((Key) => ({ Key })) };
			throw Object.assign(new Error("precondition"), { name: "PreconditionFailed" });
		};
	};

	it("resolves false when the copy is refused because the destination is taken", async () => {
		refuse([copy.key]);

		await expect(storeOriginal(copy, LOCATION)).resolves.toBe(false);
	});

	it("fails when the copy is refused because the source no longer matches the ETag that was read", async () => {
		refuse([]);

		await expect(storeOriginal(copy, LOCATION)).rejects.toThrow('"trip/photo.jpg" changed after it was read');
	});
});

describe("storeManifest guard", () => {
	it("sends nothing for a manifest whose key would not be manifest.json inside a set folder", async () => {
		await expect(storeManifest({ ...MANIFEST, name: "" }, LOCATION, { force: true })).rejects.toThrow(
			'Refusing to write "japan-2025/kyoto//manifest.json"',
		);

		expect(s3.sent).toEqual([]);
	});
});

describe("readManifest", () => {
	it("returns the manifest stored for a set", async () => {
		s3.respond = async () => bodyOf(JSON.stringify(MANIFEST));

		await expect(readManifest(MANIFEST, LOCATION)).resolves.toEqual(MANIFEST);

		expect(s3.sent).toEqual([
			{
				command: "GetObject",
				input: { Bucket: "example-bucket", Key: "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json" },
			},
		]);
	});

	it("returns null when the set has no manifest", async () => {
		s3.respond = async () => {
			throw Object.assign(new Error("The specified key does not exist."), { name: "NoSuchKey" });
		};

		await expect(readManifest(MANIFEST, LOCATION)).resolves.toBeNull();
	});

	it.each([
		["text that is not JSON", "<html>"],
		["JSON of another app", '{"name":"web app"}'],
		["JSON with variants that are not an object", '{"schema":1,"variants":[]}'],
	])("refuses %s at the manifest key as not a manifest", async (_label, content) => {
		s3.respond = async () => bodyOf(content);

		await expect(readManifest(MANIFEST, LOCATION)).rejects.toThrow(NotAManifestError);
	});

	it("passes on any other failure, so a refused read is never taken for a missing manifest", async () => {
		s3.respond = async () => {
			throw Object.assign(new Error("Access Denied"), { name: "AccessDenied" });
		};

		await expect(readManifest(MANIFEST, LOCATION)).rejects.toThrow("Access Denied");
	});
});

describe("readObject", () => {
	it("returns the object's bytes", async () => {
		s3.respond = async () => bodyOf(Buffer.from([1, 2, 3]));

		await expect(readObject("trip/photo/small_photo.webp", LOCATION)).resolves.toEqual(Buffer.from([1, 2, 3]));

		expect(s3.sent).toEqual([
			{ command: "GetObject", input: { Bucket: "example-bucket", Key: "trip/photo/small_photo.webp" } },
		]);
	});
});

describe("request deadline", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("sends every read and write with a deadline", async () => {
		s3.respond = async () => bodyOf(JSON.stringify(MANIFEST));

		await readObject("trip/photo/small_photo.webp", LOCATION);
		await readManifest(MANIFEST, LOCATION);
		await storeManifest(MANIFEST, LOCATION);

		expect(s3.options).toHaveLength(3);
		for (const options of s3.options) expect(options?.abortSignal).toBeInstanceOf(AbortSignal);
	});

	it.each([
		["readObject", () => readObject("trip/photo/small_photo.webp", LOCATION)],
		["readManifest", () => readManifest(MANIFEST, LOCATION)],
		["storeManifest", () => storeManifest(MANIFEST, LOCATION)],
		["imageSetExists", () => imageSetExists(MANIFEST, LOCATION)],
	])("fails %s with a reason that names the deadline when the request is aborted", async (_name, run) => {
		respondOnlyToAbort();

		const request = run();
		const outcome = expect(request).rejects.toThrow(`S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		await outcome;
	});

	it("fails storeOriginal when the listing after a refused copy never answers", async () => {
		s3.respond = async (sent) => {
			if (sent.command === "ListObjectsV2") return new Promise(() => {});
			throw Object.assign(new Error("precondition"), { name: "PreconditionFailed" });
		};

		const copy = { key: "trip/photo/original.jpg", copyFrom: "trip/photo.jpg", ifMatch: '"v1"' };
		const outcome = expect(storeOriginal(copy, LOCATION)).rejects.toThrow(
			`S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
		);
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		await outcome;
	});

	it("fails readObject when the body stalls after the headers arrived", async () => {
		s3.respond = async () => ({
			Body: {
				transformToString: () => new Promise<string>(() => {}),
				transformToByteArray: () => new Promise<Uint8Array>(() => {}),
			},
		});

		const outcome = expect(readObject("trip/photo/small_photo.webp", LOCATION)).rejects.toThrow(
			`S3 request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
		);
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
		await outcome;
	});

	it("clears its deadline once the request settles", async () => {
		s3.respond = async () => bodyOf("bytes");

		await readObject("trip/photo/small_photo.webp", LOCATION);

		expect(vi.getTimerCount()).toBe(0);
	});

	it("keeps a Bun process alive while a request that never settles waits for its deadline", async () => {
		// The child runs on real time, so the fake clock would stop the liveness timer below.
		vi.useRealTimers();
		const child = spawn(
			"bun",
			[
				"-e",
				`import { withDeadline } from "@/modules/storage/services/s3-operations";
				withDeadline(() => new Promise(() => {})).then(() => process.exit(2), () => process.exit(3));`,
			],
			{
				cwd: path.resolve(__dirname, "../../../.."),
				env: { ...process.env, ACCESS_KEY_ID: "test-key-id", SECRET_ACCESS_KEY: "test-secret" },
			},
		);
		const exited = new Promise<number | null>((resolve) => child.once("exit", resolve));

		let aliveTimer: ReturnType<typeof setTimeout> | undefined;
		const alive = new Promise((resolve) => {
			aliveTimer = setTimeout(() => resolve("alive"), 1500);
		});
		const early = await Promise.race([exited, alive]);
		clearTimeout(aliveTimer);
		child.kill();
		await exited;

		expect(early).toBe("alive");
	});
});
