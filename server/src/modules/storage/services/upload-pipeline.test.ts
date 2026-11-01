import { createHash } from "node:crypto";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Manifest } from "~/shared/types";

import { s3 } from "../fake-s3";
import { dimensionsOf, makeJpeg } from "../test-helpers";
import { runUploadPipeline } from "./upload-pipeline";

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const puts = () => s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input);

const manifestPut = () => puts().find(({ Key }) => Key.endsWith(".json"));

type FakeBucketOptions = {
	/** Keys whose write throws `S3 is down`. */
	failOn?: (key: string) => boolean;
	/** Keys whose delete throws. */
	failDelete?: (key: string) => boolean;
	/** Keys whose write never answers, not even to an abort, yet lands the moment it is aborted. */
	stallOn?: (key: string) => boolean;
};

/** A bucket that remembers what was stored: create-only puts fail on a taken key, and deletes remove. Listings only find keys already present when the upload begins, like S3's own check. */
const fakeBucket = (options: FakeBucketOptions) => {
	const { promise: stalled, resolve: onStall } = Promise.withResolvers<void>();
	const bucket = {
		...options,
		objects: new Set<string>(),
		keys: () => Array.from(bucket.objects).sort(),
		/** Resolves once a write matched by `stallOn` has been sent. */
		stalled,
	};
	s3.respond = async (sent, sendOptions) => {
		const { Key, Prefix, IfNoneMatch } = sent.input as { Key: string; Prefix?: string; IfNoneMatch?: string };
		if (sent.command === "ListObjectsV2") {
			return {
				Contents: Array.from(bucket.objects)
					.filter((key) => key.startsWith(Prefix ?? ""))
					.map((key) => ({ Key: key })),
			};
		}
		if (sent.command === "DeleteObject") {
			if (bucket.failDelete?.(Key)) throw new Error("delete refused");
			bucket.objects.delete(Key);
			return {};
		}
		if (bucket.failOn?.(Key)) throw new Error("S3 is down");
		if (bucket.stallOn?.(Key)) {
			sendOptions?.abortSignal?.addEventListener("abort", () => bucket.objects.add(Key));
			onStall();
			return new Promise(() => {});
		}
		if (IfNoneMatch && bucket.objects.has(Key)) {
			throw Object.assign(new Error("precondition"), { name: "PreconditionFailed" });
		}
		bucket.objects.add(Key);
		return s3.defaultRespond(sent);
	};
	return bucket;
};

const upload = async (
	fileName = "photo.jpg",
	destination = "trip",
	jpegOptions: Parameters<typeof makeJpeg>[0] = { width: 300, height: 150 },
) => {
	const jpeg = await makeJpeg(jpegOptions);

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
		).toEqual(["trip/photo/placeholder_photo.webp", "trip/photo/full_photo.webp"]);
		expect(files.map(({ variant, width, height }) => ({ variant, width, height }))).toEqual([
			{ variant: "placeholder", width: 20, height: 10 },
			{ variant: "full", width: 300, height: 150 },
		]);
	});

	it("stores the uploaded file unchanged as original.{ext} first, create-only, with its extension lower-cased", async () => {
		const jpeg = await makeJpeg({ width: 300, height: 150 });

		await runUploadPipeline({
			fileEntries: [["0", new File([jpeg], "Photo.JPG", { type: "image/jpeg" })]],
			bucketName: "example-bucket",
			bucketRegion: "us-east-1",
			destination: "trip",
		});

		expect(puts()[0]).toMatchObject({ Key: "trip/Photo/original.jpg", ContentType: "image/jpeg", IfNoneMatch: "*" });
		expect(Buffer.compare(puts()[0].Body as Buffer, jpeg)).toBe(0);
	});

	it("names an original uploaded without an extension after its format, so it still matches original.*", async () => {
		await upload("photo");

		expect(puts()[0].Key).toBe("trip/photo/original.jpeg");
	});

	it("records the original as the manifest's private source, measured after EXIF rotation", async () => {
		await upload("photo.jpg", "trip", { width: 300, height: 150, orientation: 6 });

		const original = puts()[0].Body as Buffer;
		const { source }: Manifest = JSON.parse(manifestPut()?.Body as string);

		expect(source).toEqual({
			key: "trip/photo/original.jpg",
			public: false,
			sha256: createHash("sha256").update(original).digest("hex"),
			bytes: original.length,
			width: 150,
			height: 300,
		});
	});

	it("answers 409 and stores nothing more when another upload stored the original first", async () => {
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.Key.endsWith("/original.jpg")) {
				throw Object.assign(new Error("At least one of the pre-conditions you specified did not hold"), {
					name: "PreconditionFailed",
				});
			}
			return s3.defaultRespond(sent);
		};

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(puts().map(({ Key }) => Key)).toEqual(["trip/photo/original.jpg"]);
	});

	it("stores a manifest last that describes the objects stored before it", async () => {
		await uploadStored();

		expect(puts()).toHaveLength(4);
		const [, placeholder, full, last] = puts();
		expect(last.Key).toBe("trip/photo/manifest.json");

		const manifest: Manifest = JSON.parse(last.Body as string);
		expect(manifest).toMatchObject({
			schema: 1,
			name: "photo",
			folder: "trip",
			layout: "nested",
		});
		expect(manifest.variants).toEqual({
			placeholder: {
				key: "trip/photo/placeholder_photo.webp",
				format: "webp",
				width: 20,
				height: 10,
				bytes: (placeholder.Body as Buffer).length,
				etag: '"etag-of-trip/photo/placeholder_photo.webp"',
			},
			full: {
				key: "trip/photo/full_photo.webp",
				format: "webp",
				width: 300,
				height: 150,
				bytes: (full.Body as Buffer).length,
				etag: '"etag-of-trip/photo/full_photo.webp"',
			},
		});
	});

	it("lists every size of a portrait in the manifest with its real dimensions, fitted to its height", async () => {
		await upload("photo.jpg", "trip", { width: 960, height: 1440 });

		const { variants }: Manifest = JSON.parse(manifestPut()?.Body as string);

		expect(dimensionsOf(variants)).toEqual({
			placeholder: { width: 13, height: 20 },
			small: { width: 267, height: 400 },
			medium: { width: 533, height: 800 },
			large: { width: 960, height: 1440 },
			full: { width: 960, height: 1440 },
		});
	});

	it("lists the full size in the manifest at its capped dimensions", async () => {
		await upload("photo.jpg", "trip", { width: 6000, height: 4000 });

		const { variants }: Manifest = JSON.parse(manifestPut()?.Body as string);

		expect(dimensionsOf(variants).full).toEqual({ width: 3840, height: 2560 });
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

		expect(puts().slice(1, 3)).toEqual([
			expect.objectContaining({ Key: "trip/photo/placeholder_photo.webp", CacheControl: "public, max-age=86400" }),
			expect.objectContaining({ Key: "trip/photo/full_photo.webp", CacheControl: "public, max-age=86400" }),
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

	it("deletes the original and the sizes it stored when a size fails, so a retry succeeds", async () => {
		const bucket = fakeBucket({ failOn: (key) => key.includes("full_") });

		await expect(upload()).rejects.toThrow("S3 is down");

		expect(puts().some(({ Key }) => Key.endsWith(".json"))).toBe(false);
		expect(bucket.keys()).toEqual([]);

		bucket.failOn = () => false;
		await expect(upload()).resolves.toHaveProperty("files");
		expect(bucket.keys()).toContain("trip/photo/manifest.json");
	});

	describe("when a request never answers", () => {
		afterEach(() => vi.useRealTimers());

		it("fails the upload after the deadline when a size write stalls, and deletes everything it stored, the late write included", async () => {
			const bucket = fakeBucket({ stallOn: (key) => key.includes("full_") });
			vi.useFakeTimers();

			const outcome = expect(upload()).rejects.toThrow("S3 request timed out after 60s");
			await bucket.stalled;
			await vi.advanceTimersByTimeAsync(60_000);
			await outcome;

			expect(bucket.keys()).toEqual([]);
			expect(manifestPut()).toBeUndefined();
		});
	});

	it("deletes the original and every size when the manifest fails to store", async () => {
		const bucket = fakeBucket({ failOn: (key) => key.endsWith("/manifest.json") });

		await expect(upload()).rejects.toThrow("S3 is down");

		expect(bucket.keys()).toEqual([]);
	});

	it("names the keys left behind when the clean-up fails too", async () => {
		fakeBucket({ failOn: (key) => key.endsWith("/manifest.json"), failDelete: (key) => key.endsWith("/original.jpg") });

		await expect(upload()).rejects.toThrow(/S3 is down.*trip\/photo\/original\.jpg/);
	});

	it("deletes nothing when the original already belongs to someone else", async () => {
		const bucket = fakeBucket({});
		bucket.objects.add("trip/photo/original.jpg");

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(s3.sent.some(({ command }) => command === "DeleteObject")).toBe(false);
		expect(bucket.keys()).toEqual(["trip/photo/original.jpg"]);
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
		["original.v2.png", "trip"],
		["photo.png", "trip/original.v2"],
	])("refuses %s into destination '%s' as reserved before touching S3", async (fileName, destination) => {
		await expect(upload(fileName, destination)).resolves.toMatchObject({ refused: "reserved" });

		expect(s3.sent).toEqual([]);
	});

	it.each([
		["src.jpg", "trip"],
		["manifests.jpg", ""],
		["photo.jpg", "manifests/trip"],
		["original.jpg", "trip"],
	])("accepts %s into destination '%s': only the start of a key is reserved", async (fileName, destination) => {
		await expect(upload(fileName, destination)).resolves.toHaveProperty("files");
	});

	it("answers 409 when another upload stores the manifest first, never replacing it", async () => {
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.Key.endsWith("/manifest.json")) {
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
