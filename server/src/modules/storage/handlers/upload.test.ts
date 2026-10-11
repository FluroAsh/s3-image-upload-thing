import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { uploadImagesHandler } from "./upload";

vi.mock("../services/upload-pipeline", () => ({ runUploadPipeline: vi.fn() }));

const validFields = {
	bucketName: "b",
	bucketRegion: "ap-southeast-2",
	images: new File(["x"], "a.png"),
};

describe("uploadImagesHandler", () => {
	it.each([
		["bucketName", "Bucket name is required"],
		["bucketRegion", "Bucket region is required"],
		["images", "No images provided"],
	] as const)("rejects a request missing %s with a 400", async (missingField, message) => {
		const app = new Hono().post("/upload", uploadImagesHandler);
		const body = new FormData();
		for (const [field, value] of Object.entries(validFields)) {
			if (field !== missingField) body.append(field, value);
		}

		const res = await app.request("/upload", { method: "POST", body });

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: message });
	});
});
