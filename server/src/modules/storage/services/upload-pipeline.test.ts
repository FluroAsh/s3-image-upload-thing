import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import { runUploadPipeline } from "./upload-pipeline";

const { storedKeys } = vi.hoisted(() => {
	process.env.ACCESS_KEY_ID = "test-key-id";
	process.env.SECRET_ACCESS_KEY = "test-secret";
	return { storedKeys: [] as string[] };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: async () => "https://cdn.example.test/signed" }));
vi.mock("@aws-sdk/client-s3", () => ({
	GetObjectCommand: class {},
	ListObjectsV2Command: class {},
	PutObjectCommand: class {
		constructor(input: { Key: string }) {
			storedKeys.push(input.Key);
		}
	},
	S3Client: class {
		send = async () => ({ ETag: '"etag"' });
	},
}));

describe("runUploadPipeline", () => {
	it("stores a 300px-wide image as placeholder and full size only, returning each one's width and height", async () => {
		const jpeg = await sharp({ create: { width: 300, height: 150, channels: 3, background: "#c0ffee" } })
			.jpeg()
			.toBuffer();

		const files = await runUploadPipeline({
			fileEntries: [["0", new File([jpeg], "photo.jpg", { type: "image/jpeg" })]],
			bucketName: "example-bucket",
			bucketRegion: "us-east-1",
			destination: "trip",
		});

		expect(storedKeys).toEqual(["trip/photo/placeholder_photo.webp", "trip/photo/lossless_photo.webp"]);
		expect(files.map(({ variant, width, height }) => ({ variant, width, height }))).toEqual([
			{ variant: "placeholder", width: 20, height: 10 },
			{ variant: "lossless", width: 300, height: 150 },
		]);
	});
});
