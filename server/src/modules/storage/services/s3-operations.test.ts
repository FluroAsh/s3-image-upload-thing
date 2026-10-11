import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../fake-s3";
import { buildManifest } from "./manifest";
import { readManifest, readObject, storeManifest } from "./s3-operations";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const LOCATION = { bucketName: "example-bucket", bucketRegion: "us-east-1" };

const MANIFEST = buildManifest({
	bucket: "example-bucket",
	pathPrefix: "",
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

/** Makes the next request's deadline already passed, and S3 fail the way a request aborted by it does. */
const expireNextRequest = () => {
	const expired = AbortSignal.abort();
	vi.spyOn(AbortSignal, "timeout").mockReturnValue(expired);
	s3.respond = async (_sent, options) => {
		if (options?.abortSignal === expired) throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
		return {};
	};
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
			Key: "manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json",
			ContentType: "application/json",
			CacheControl: "public, max-age=300",
		});
		expect(s3.sent[0].input.IfNoneMatch).toBeUndefined();
	});
});

describe("readManifest", () => {
	it("returns the manifest stored for a set", async () => {
		s3.respond = async () => bodyOf(JSON.stringify(MANIFEST));

		await expect(readManifest(MANIFEST, LOCATION)).resolves.toEqual(MANIFEST);

		expect(s3.sent).toEqual([
			{
				command: "GetObject",
				input: { Bucket: "example-bucket", Key: "manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json" },
			},
		]);
	});

	it("returns null when the set has no manifest", async () => {
		s3.respond = async () => {
			throw Object.assign(new Error("The specified key does not exist."), { name: "NoSuchKey" });
		};

		await expect(readManifest(MANIFEST, LOCATION)).resolves.toBeNull();
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
	afterEach(() => vi.restoreAllMocks());

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
	])("fails %s with a reason that names the deadline when the request is aborted", async (_name, run) => {
		expireNextRequest();

		await expect(run()).rejects.toThrow("S3 request timed out after 60s");
	});

	it("fails readObject when the body stalls after the headers arrived", async () => {
		const controller = new AbortController();
		vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
		s3.respond = async () => ({
			Body: {
				transformToString: () => new Promise<string>(() => {}),
				transformToByteArray: () => new Promise<Uint8Array>(() => {}),
			},
		});
		setTimeout(() => controller.abort(), 5);

		await expect(readObject("trip/photo/small_photo.webp", LOCATION)).rejects.toThrow("S3 request timed out after 60s");
	});
});
