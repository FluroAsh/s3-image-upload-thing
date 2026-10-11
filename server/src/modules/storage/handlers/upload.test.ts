import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { runUploadPipeline } from "../services/upload-pipeline";
import { uploadImagesHandler } from "./upload";

vi.mock("../services/upload-pipeline", () => ({ runUploadPipeline: vi.fn() }));

const post = (fields: Record<string, string | File | File[]>) => {
	const app = new Hono().post("/upload", uploadImagesHandler);
	const body = new FormData();
	for (const [field, value] of Object.entries(fields)) {
		for (const entry of Array.isArray(value) ? value : [value]) body.append(field, entry);
	}
	return app.request("/upload", { method: "POST", body });
};

const validFields = {
	bucketName: "b",
	bucketRegion: "ap-southeast-2",
	images: new File(["x"], "a.png"),
};

describe("uploadImagesHandler", () => {
	beforeEach(() => vi.clearAllMocks());

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

	it.each([
		["trip/", "trip"],
		["/trip//2025/", "trip/2025"],
		["", ""],
	])("cleans destination '%s' to '%s' before the pipeline sees it", async (destination, cleaned) => {
		vi.mocked(runUploadPipeline).mockResolvedValue({ files: [] });

		const res = await post({ ...validFields, destination });

		expect(res.status).toBe(200);
		expect(runUploadPipeline).toHaveBeenCalledWith(expect.objectContaining({ destination: cleaned }));
	});

	it.each(["trip/../x", "./trip", "trip/."])("rejects destination %s with a 400", async (destination) => {
		const res = await post({ ...validFields, destination });

		expect(res.status).toBe(400);
		expect(runUploadPipeline).not.toHaveBeenCalled();
	});

	it("rejects two files that would share one set name with a 400 before the pipeline runs", async () => {
		const res = await post({ ...validFields, images: [new File(["x"], "a.png"), new File(["y"], "a.jpg")] });

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Two files in one upload cannot share a name" });
		expect(runUploadPipeline).not.toHaveBeenCalled();
	});

	it("maps an 'exists' refusal to a 409", async () => {
		vi.mocked(runUploadPipeline).mockResolvedValue({ refused: "exists", names: ["a", "b"] });

		const res = await post(validFields);

		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "An image set already exists for: a, b" });
	});

	it("maps a 'reserved' refusal to a 400", async () => {
		vi.mocked(runUploadPipeline).mockResolvedValue({ refused: "reserved", names: ["legacy/"] });

		const res = await post(validFields);

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Path "legacy/" is reserved' });
	});
});
