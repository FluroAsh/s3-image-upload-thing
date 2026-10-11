import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Manifest } from "~/shared/types";

import { makeJpeg } from "../test-helpers";
import { runUploadPipeline } from "./upload-pipeline";

type SentCommand = {
	/** Which SDK command was sent, e.g. `"PutObject"`. */
	command: string;
	/** The input the command was built with. */
	input: Record<string, unknown> & {
		/** Bucket key the command targets. */
		Key: string;
		/** Bytes or text to store; only on a put. */
		Body?: Buffer | string;
	};
};

type S3Response = {
	/** ETag S3 returns for a stored object; only on a put. */
	ETag?: string;
	/** Objects found under a prefix; only on a listing. */
	Contents?: {
		/** Bucket key of the listed object. */
		Key: string;
	}[];
};

const s3 = vi.hoisted(() => {
	process.env.ACCESS_KEY_ID = "test-key-id";
	process.env.SECRET_ACCESS_KEY = "test-secret";

	const defaultRespond = async ({ command, input }: SentCommand): Promise<S3Response> => {
		if (command === "HeadObject") throw Object.assign(new Error("Not Found"), { name: "NotFound" });
		return { ETag: `"etag-of-${input.Key}"` };
	};

	return { sent: [] as SentCommand[], defaultRespond, respond: defaultRespond };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", () => {
	const commandClass = (command: string) =>
		class {
			command = command;
			constructor(public input: SentCommand["input"]) {}
		};

	return {
		GetObjectCommand: commandClass("GetObject"),
		HeadObjectCommand: commandClass("HeadObject"),
		ListObjectsV2Command: commandClass("ListObjectsV2"),
		PutObjectCommand: commandClass("PutObject"),
		S3Client: class {
			send = async ({ command, input }: SentCommand) => {
				s3.sent.push({ command, input });
				return s3.respond({ command, input });
			};
		},
	};
});

const puts = () => s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input);

const manifestPut = () => puts().find(({ Key }) => Key.startsWith("manifests/"));

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
		expect(last.Key).toBe("manifests/trip/photo.json");

		const manifest: Manifest = JSON.parse(last.Body as string);
		expect(manifest).toMatchObject({
			schema: 1,
			name: "photo",
			folder: "trip",
			bucket: "example-bucket",
			pathPrefix: "",
			layout: "nested",
			source: null,
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
			Key: "manifests/trip/photo.json",
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

	it("refuses a name that already has a manifest and stores nothing", async () => {
		s3.respond = async (sent) => (sent.command === "HeadObject" ? {} : s3.defaultRespond(sent));

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(s3.sent).toEqual([
			{ command: "HeadObject", input: { Bucket: "example-bucket", Key: "manifests/trip/photo.json" } },
		]);
	});

	it("refuses a set that has variants but no manifest, asking for one key under the set's prefix", async () => {
		s3.respond = async (sent) =>
			sent.command === "ListObjectsV2"
				? { Contents: [{ Key: "trip/photo/small_photo.webp" }] }
				: s3.defaultRespond(sent);

		await expect(upload()).resolves.toEqual({ refused: "exists", names: ["photo"] });

		expect(s3.sent.map(({ command }) => command)).toEqual(["HeadObject", "ListObjectsV2"]);
		expect(s3.sent[1].input).toMatchObject({ Bucket: "example-bucket", Prefix: "trip/photo/", MaxKeys: 1 });
	});

	it.each([
		["legacy.png", ""],
		["manifests.png", ""],
		["src.png", ""],
		["photo.png", "legacy"],
		["photo.png", "manifests/trip"],
	])("refuses %s into destination '%s' as reserved before touching S3", async (fileName, destination) => {
		await expect(upload(fileName, destination)).resolves.toMatchObject({ refused: "reserved" });

		expect(s3.sent).toEqual([]);
	});

	it("accepts a file named manifests inside a destination, since only the start of the key is reserved", async () => {
		await expect(upload("manifests.jpg", "trip")).resolves.toHaveProperty("files");
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

		expect(manifestPut()).toMatchObject({ Key: "manifests/trip/photo.json", IfNoneMatch: "*" });
	});
});
