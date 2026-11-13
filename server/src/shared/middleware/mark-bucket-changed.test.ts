import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadFileResult } from "~/shared/types";

import { markBucketChangedOnWrite } from "./mark-bucket-changed";

const mark = vi.hoisted(() => vi.fn());
vi.mock("@/modules/settings/services/deploy-hooks", () => ({ markBucketChanged: mark }));

let uploadResults: Pick<UploadFileResult, "file" | "status">[] = [];

const storage = new Hono()
	.use(markBucketChangedOnWrite)
	.get("/collections", (ctx) => ctx.json({}))
	.post("/collections", (ctx) => ctx.json({}, 201))
	.post("/presigned-urls", (ctx) => ctx.json({}))
	.put("/collections/members", (ctx) => ctx.json({ error: "no" }, 400))
	.post("/upload", async (ctx) => {
		await ctx.req.parseBody({ all: true });
		return ctx.json({ results: uploadResults });
	});
const run = (method: string, route: string, init: RequestInit = {}) => storage.request(route, { method, ...init });
const upload = () => {
	const form = new FormData();
	form.set("bucketName", "from-form");
	return run("POST", "/upload", { body: form });
};

beforeEach(() => {
	mark.mockResolvedValue(undefined);
});

afterEach(() => {
	mark.mockReset();
	uploadResults = [];
});

describe("markBucketChangedOnWrite", () => {
	it("marks the bucket after a successful write", async () => {
		await run("POST", "/collections?bucket=b&region=r");

		expect(mark).toHaveBeenCalledWith("b");
	});

	it("takes an upload's bucket from its form once a file is stored", async () => {
		uploadResults = [
			{ file: "a.png", status: "failed" },
			{ file: "b.png", status: "stored" },
		];

		const res = await upload();

		expect(res.status).toBe(200);
		expect(mark).toHaveBeenCalledWith("from-form");
	});

	it("leaves the bucket alone when an upload stored nothing", async () => {
		uploadResults = [
			{ file: "a.png", status: "refused" },
			{ file: "b.png", status: "failed" },
		];

		await upload();

		expect(mark).not.toHaveBeenCalled();
	});

	it("ignores reads, presigned URLs and failed writes", async () => {
		await run("GET", "/collections?bucket=b&region=r");
		await run("POST", "/presigned-urls?bucket=b&region=r");
		await run("PUT", "/collections/members?bucket=b&region=r");

		expect(mark).not.toHaveBeenCalled();
	});

	it("answers without waiting for the mark to finish", async () => {
		mark.mockReturnValue(new Promise(() => {}));

		const res = await run("POST", "/collections?bucket=b&region=r");

		expect(res.status).toBe(201);
	});

	it("logs a failed mark without failing the response", async () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		mark.mockRejectedValue(new Error("Settings file is not valid JSON"));

		const res = await run("POST", "/collections?bucket=b&region=r");

		expect(res.status).toBe(201);
		await vi.waitFor(() =>
			expect(log).toHaveBeenCalledWith("Marking bucket changed failed:", "Settings file is not valid JSON"),
		);
		log.mockRestore();
	});
});
