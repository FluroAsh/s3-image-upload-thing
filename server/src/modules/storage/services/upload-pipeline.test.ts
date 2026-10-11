import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Manifest } from "~/shared/types";

import { s3 } from "../fake-s3";
import { makeJpeg } from "../test-helpers";
import { runUploadPipeline } from "./upload-pipeline";

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const puts = () => s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input);

const manifestPut = () => puts().find(({ Key }) => Key.endsWith(".json"));

const upload = async (fileName = "photo.jpg", destination = "trip") => {
	const jpeg = await makeJpeg({ width: 300, height: 150 });

	return runUploadPipeline({
		fileEntries: [["0", new File([jpeg], fileName, { type: "image/jpeg" })]],
		bucketName: "example-bucket",
		bucketRegion: "us-east-1",
		destination,
	});
};

const uploadStored = async () => {
	const result = await upload();
	if (!("files" in result)) throw new Error(`Upload was refused: ${result.refused}`);
	return result.files;
};

beforeEach(() => {
	s3.sent.length = 0;
	s3.respond = s3.defaultRespond;
});

describe("runUploadPipeline", () => {
	it("stores a 300px-wide image as placeholder and full size only, returning each one's width and height", async () => {
		const files = await uploadStored();

		expect(
			puts()
				.map(({ Key }) => Key)
				.filter((key) => key.endsWith(".webp")),
		).toEqual(["trip/photo/placeholder_photo.webp", "trip/photo/lossless_photo.webp"]);
		expect(files.map(({ variant, width, height }) => ({ variant, width, height }))).toEqual([
			{ variant: "placeholder", width: 20, height: 10 },
			{ variant: "lossless", width: 300, height: 150 },
		]);
	});

	it("stores a manifest last that describes the objects stored before it", async () => {
		await uploadStored();

		expect(puts()).toHaveLength(3);
		const [placeholder, lossless, last] = puts();
		expect(last.Key).toBe("trip/photo/manifest.json");

		const manifest: Manifest = JSON.parse(last.Body as string);
		expect(manifest).toMatchObject({
			schema: 1,
			name: "photo",
			folder: "trip",
			layout: "nested",
			source: null,
		});
		expect(manifest).not.toHaveProperty("bucket");
		expect(manifest).not.toHaveProperty("pathPrefix");
		expect(manifest.variants).toEqual({
			placeholder: {
				key: "trip/photo/placeholder_photo.webp",
				format: "webp",
				width: 20,
				height: 10,
				bytes: (placeholder.Body as Buffer).length,
				etag: '"etag-of-trip/photo/placeholder_photo.webp"',
			},
			lossless: {
				key: "trip/photo/lossless_photo.webp",
				format: "webp",
				width: 300,
				height: 150,
				bytes: (lossless.Body as Buffer).length,
				etag: '"etag-of-trip/photo/lossless_photo.webp"',
			},
		});
	});

	it("stores the manifest as JSON that caches for five minutes", async () => {
		await uploadStored();

		expect(manifestPut()).toMatchObject({
			Key: "trip/photo/manifest.json",
			ContentType: "application/json",
			CacheControl: "public, max-age=300",
		});
	});

	it("stores every variant with a Cache-Control header", async () => {
		await uploadStored();

		expect(puts().slice(0, 2)).toEqual([
			expect.objectContaining({ Key: "trip/photo/placeholder_photo.webp", CacheControl: "public, max-age=86400" }),
			expect.objectContaining({ Key: "trip/photo/lossless_photo.webp", CacheControl: "public, max-age=86400" }),
		]);
	});

	it("records the 20px placeholder in the manifest as a base64 data URI", async () => {
		await uploadStored();

		const { placeholder }: Manifest = JSON.parse(manifestPut()?.Body as string);
		const [header, base64] = (placeholder ?? "").split(",");
		const { format, width } = await sharp(Buffer.from(base64 ?? "", "base64")).metadata();

		expect(header).toBe("data:image/webp;base64");
		expect({ format, width }).toEqual({ format: "webp", width: 20 });
	});

	it("writes no manifest when a variant fails to store", async () => {
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.Key.includes("lossless_")) throw new Error("S3 is down");
			return s3.defaultRespond(sent);
		};

		await expect(upload()).rejects.toThrow("S3 is down");

		expect(puts().map(({ Key }) => Key)).toEqual([
			"trip/photo/placeholder_photo.webp",
			"trip/photo/lossless_photo.webp",
		]);
	});

	it.each([
		["a manifest", "trip/photo/manifest.json"],
		["variants but no manifest", "trip/photo/small_photo.webp"],
		["only a stray file", "trip/photo/notes.txt"],
	])("refuses a name whose folder holds %s, with one request for one key under the set's prefix", async (_holds, key) => {
		s3.respond = async (sent) =>
			sent.command === "ListObjectsV2" ? { Contents: [{ Key: key }] } : s3.defaultRespond(sent);

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(s3.sent).toEqual([
			{ command: "ListObjectsV2", input: { Bucket: "example-bucket", Prefix: "trip/photo/", MaxKeys: 1 } },
		]);
	});

	it.each([
		["legacy.png", ""],
		["src.png", ""],
		["photo.png", "legacy"],
		["photo.png", "src/trip"],
	])("refuses %s into destination '%s' as reserved before touching S3", async (fileName, destination) => {
		await expect(upload(fileName, destination)).resolves.toMatchObject({ refused: "reserved" });

		expect(s3.sent).toEqual([]);
	});

	it.each([
		["src.jpg", "trip"],
		["manifests.jpg", ""],
		["photo.jpg", "manifests/trip"],
	])("accepts %s into destination '%s': only the start of a key is reserved, and manifests/ no longer is", async (fileName, destination) => {
		await expect(upload(fileName, destination)).resolves.toHaveProperty("files");
	});

	it("answers 409 when another upload stores the manifest first, never replacing it", async () => {
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.IfNoneMatch === "*") {
				throw Object.assign(new Error("At least one of the pre-conditions you specified did not hold"), {
					name: "PreconditionFailed",
				});
			}
			return s3.defaultRespond(sent);
		};

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(manifestPut()).toMatchObject({ Key: "trip/photo/manifest.json", IfNoneMatch: "*" });
	});
});
