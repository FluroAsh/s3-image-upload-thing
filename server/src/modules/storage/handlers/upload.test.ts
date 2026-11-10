import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UPLOAD_FIELD } from "~/shared/constants/upload";
import type { UploadFileResult } from "~/shared/types";

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
	[UPLOAD_FIELD.BucketName]: "b",
	[UPLOAD_FIELD.BucketRegion]: "ap-southeast-2",
	[UPLOAD_FIELD.Images]: new File(["x"], "a.png"),
};

describe("uploadImagesHandler", () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		[UPLOAD_FIELD.BucketName, "Bucket name is required"],
		[UPLOAD_FIELD.BucketRegion, "Bucket region is required"],
		[UPLOAD_FIELD.Images, "No images provided"],
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
		vi.mocked(runUploadPipeline).mockResolvedValue([]);

		const res = await post({ ...validFields, [UPLOAD_FIELD.Destination]: destination });

		expect(res.status).toBe(200);
		expect(runUploadPipeline).toHaveBeenCalledWith(expect.objectContaining({ destination: cleaned }));
	});

	it.each(["trip/../x", "./trip", "trip/."])("rejects destination %s with a 400", async (destination) => {
		const res = await post({ ...validFields, [UPLOAD_FIELD.Destination]: destination });

		expect(res.status).toBe(400);
		expect(runUploadPipeline).not.toHaveBeenCalled();
	});

	it("rejects two files that would share one set name with a 400 before the pipeline runs", async () => {
		const res = await post({ ...validFields, images: [new File(["x"], "a.png"), new File(["y"], "a.jpg")] });

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Two files in one upload cannot share a name" });
		expect(runUploadPipeline).not.toHaveBeenCalled();
	});

	it("answers 200 with every file's result, refused ones included", async () => {
		const results: UploadFileResult[] = [
			{ file: "a.png", status: "stored", variants: [] },
			{ file: "b.png", status: "refused", reason: "Not a valid image" },
		];
		vi.mocked(runUploadPipeline).mockResolvedValue(results);

		const res = await post(validFields);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ results });
	});
});
