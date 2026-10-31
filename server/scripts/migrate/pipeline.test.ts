import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "@/modules/storage/fake-s3";
import { imageSetExists, readObject } from "@/modules/storage/services/s3-operations";
import { runUploadPipeline } from "@/modules/storage/services/upload-pipeline";
import { makeJpeg } from "@/modules/storage/test-helpers";

import { type MigrateIo, migrateFlatSets } from "./run";

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", async () => (await import("@/modules/storage/fake-s3")).s3.sdk);

const location = { bucketName: "example-bucket", bucketRegion: "us-east-1" };
const LISTED = ["blog/cat_ab12.webp", "blog/small_cat_ab12.webp", "blog/large_cat_ab12.webp"];

const respondWith = (original: Buffer) => {
	s3.sent.length = 0;
	s3.respond = async (sent, options) => {
		if (sent.command === "ListObjectsV2") return { Contents: [] };
		if (sent.command === "GetObject") {
			return {
				Body: { transformToString: async () => "", transformToByteArray: async () => new Uint8Array(original) },
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
	readObject: (key) => readObject(key, location),
	upload: (file, destination) => runUploadPipeline({ fileEntries: [["0", file]], destination, ...location }),
};

describe("migrateFlatSets through the upload pipeline", () => {
	it("stores only new keys inside the set's own folder, manifest last, and links to a key it stored", async () => {
		const [result] = await migrateFlatSets(LISTED, io, { write: true });

		const putKeys = s3.sent.filter(({ command }) => command === "PutObject").map(({ input }) => input.Key);
		expect(putKeys.every((key) => key.startsWith("blog/cat_ab12/") && !LISTED.includes(key))).toBe(true);
		expect(putKeys[putKeys.length - 1]).toBe("blog/cat_ab12/manifest.json");
		expect(result).toMatchObject({ outcome: "migrated", linkTo: "blog/cat_ab12/medium_cat_ab12.webp" });
		expect(putKeys).toContain(result.linkTo);
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
});
