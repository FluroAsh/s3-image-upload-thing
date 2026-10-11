import { beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../test-helpers";
import { buildManifest } from "./manifest";
import { readManifest, readObject, storeManifest } from "./s3-operations";

vi.mock("@aws-sdk/client-s3", async () => (await import("../test-helpers")).s3.sdk);

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

beforeEach(() => {
	s3.sent.length = 0;
	s3.respond = s3.defaultRespond;
});

describe("storeManifest", () => {
	it("replaces an existing manifest when told to overwrite, by sending no create-only condition", async () => {
		await expect(storeManifest(MANIFEST, LOCATION, { overwrite: true })).resolves.toBe(true);

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
		s3.respond = async () => ({
			Body: {
				transformToString: async () => JSON.stringify(MANIFEST),
				transformToByteArray: async () => new Uint8Array(),
			},
		});

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
		s3.respond = async () => ({
			Body: { transformToString: async () => "", transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
		});

		await expect(readObject("trip/photo/small_photo.webp", LOCATION)).resolves.toEqual(Buffer.from([1, 2, 3]));

		expect(s3.sent).toEqual([
			{ command: "GetObject", input: { Bucket: "example-bucket", Key: "trip/photo/small_photo.webp" } },
		]);
	});
});
