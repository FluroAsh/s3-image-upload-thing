import { createHash } from "node:crypto";

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "@/modules/storage/fake-s3";
import { getObject, imageSetExists } from "@/modules/storage/services/s3-operations";
import { runUploadPipeline } from "@/modules/storage/services/upload-pipeline";
import { makeJpeg } from "@/modules/storage/test-helpers";
import type { Manifest } from "~/shared/types";

import { type MigrateIo, migrateFlatSets } from "./run";

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", async () => (await import("@/modules/storage/fake-s3")).s3.sdk);

const location = { bucketName: "example-bucket", bucketRegion: "us-east-1" };
const LISTED = ["blog/cat_ab12.webp", "blog/small_cat_ab12.webp", "blog/large_cat_ab12.webp"];

let original: Buffer;

const respondWith = (body: Buffer) => {
	original = body;
	s3.sent.length = 0;
	s3.respond = async (sent, options) => {
		if (sent.command === "ListObjectsV2") return { Contents: [] };
		if (sent.command === "GetObject") {
			return {
				ETag: `"read-${sent.input.Key}"`,
				Body: { transformToString: async () => "", transformToByteArray: async () => new Uint8Array(body) },
			};
		}
		return s3.defaultRespond(sent, options);
	};
};

beforeEach(async () => {
	respondWith(
		await sharp(await makeJpeg({ width: 900, height: 1600 }))
			.webp()
			.toBuffer(),
	);
});

const io: MigrateIo = {
	setExists: (set) => imageSetExists(set, location),
	readObject: (key) => getObject(key, location),
	upload: (file, destination) => runUploadPipeline({ fileEntries: [["0", file]], destination, ...location }),
};

describe("migrateFlatSets through the upload pipeline", () => {
	it("stores only new keys inside the set's own folder, manifest last, and links to a key it stored", async () => {
		const [result] = await migrateFlatSets(LISTED, io, { write: true });

		const putKeys = s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input.Key);
		expect(putKeys.every((key) => key.startsWith("blog/cat_ab12/") && !LISTED.includes(key))).toBe(true);
		expect(putKeys[putKeys.length - 1]).toBe("blog/cat_ab12/manifest.json");
		expect(result).toMatchObject({ outcome: "migrated", linkTo: "blog/cat_ab12/large_cat_ab12.webp" });
		expect(putKeys).toContain(result.linkTo);
	});

	it("copies the flat original server side into the set folder first, and records it as the manifest's source", async () => {
		await migrateFlatSets(LISTED, io, { write: true });

		const writes = s3.sent.filter(({ command }) => command === "CopyObject" || command === "PutObject");
		expect(writes[0]).toEqual({
			command: "CopyObject",
			input: {
				Bucket: "example-bucket",
				Key: "blog/cat_ab12/original.webp",
				CopySource: "example-bucket/blog/cat_ab12.webp",
				CopySourceIfMatch: '"read-blog/cat_ab12.webp"',
				IfNoneMatch: "*",
			},
		});
		expect(writes.filter(({ input }) => input.Key.endsWith("/original.webp"))).toHaveLength(1);

		const manifest: Manifest = JSON.parse(writes[writes.length - 1].input.Body as string);
		expect(manifest.source).toEqual({
			key: "blog/cat_ab12/original.webp",
			public: false,
			sha256: createHash("sha256").update(original).digest("hex"),
			bytes: original.length,
			width: 900,
			height: 1600,
		});
	});

	it("migrates a jpeg original into a webp set beside it, linking to a webp key it stored", async () => {
		respondWith(await makeJpeg({ width: 900, height: 1600 }));

		const [result] = await migrateFlatSets(["blog/dog_cd34.jpg", "blog/small_dog_cd34.jpg"], io, { write: true });

		const putKeys = s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input.Key);
		expect(putKeys.every((key) => key.startsWith("blog/dog_cd34/"))).toBe(true);
		expect(result).toMatchObject({ original: "blog/dog_cd34.jpg", outcome: "migrated" });
		expect(result.linkTo).toMatch(/^blog\/dog_cd34\/\w+_dog_cd34\.webp$/);
		expect(putKeys).toContain(result.linkTo);
	});

	it("fails a set whose flat original changed after it was read, leaving no manifest, and still migrates the others", async () => {
		const wasReplaced = (key: string) => key === "blog/cat_ab12.webp";
		const answer = s3.respond;
		s3.respond = async (sent, options) => {
			const { CopySourceIfMatch, CopySource } = sent.input as { CopySourceIfMatch?: string; CopySource?: string };
			if (sent.command === "CopyObject" && wasReplaced(CopySource?.replace("example-bucket/", "") ?? "")) {
				if (CopySourceIfMatch !== '"replaced"') {
					throw Object.assign(new Error("precondition"), { name: "PreconditionFailed" });
				}
			}
			return answer(sent, options);
		};

		const results = await migrateFlatSets([...LISTED, "blog/dog_cd34.webp", "blog/small_dog_cd34.webp"], io, {
			write: true,
		});

		expect(results.map(({ name, outcome }) => ({ name, outcome }))).toEqual([
			{ name: "cat_ab12", outcome: "failed" },
			{ name: "dog_cd34", outcome: "migrated" },
		]);
		const putKeys = s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input.Key);
		expect(putKeys.some((key) => key.startsWith("blog/cat_ab12/"))).toBe(false);
		expect(putKeys).toContain("blog/dog_cd34/manifest.json");
	});
});
