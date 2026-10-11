import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { uploadImagesHandler } from "./upload";

vi.mock("../services/upload-pipeline", () => ({ runUploadPipeline: vi.fn() }));

describe("uploadImagesHandler", () => {
	it("rejects a request missing the bucket region with a 400", async () => {
		const app = new Hono().post("/upload", uploadImagesHandler);
		const body = new FormData();
		body.append("bucketName", "b");
		body.append("images", new File(["x"], "a.png"));

		const res = await app.request("/upload", { method: "POST", body });
		const json = await res.json();

		expect(res.status).toBe(400);
		expect(json).toEqual({ error: "Bucket region is required" });
	});
});
