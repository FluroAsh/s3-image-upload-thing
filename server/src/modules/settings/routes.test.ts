import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { markBucketChangedOnWrite } from "./mark-bucket-changed";
import settings from "./routes";

const mark = vi.hoisted(() => vi.fn());
vi.mock("./services/deploy-hooks", async (importActual) => ({
	...(await importActual<typeof import("./services/deploy-hooks")>()),
	markBucketChanged: mark,
}));

const SECRET_URL = "https://example.com/hooks/abc123secret9c2e";
const q = "?bucket=b&region=r";
const app = new Hono().route("/settings", settings);
let dir: string;

const call = (method: string, route: string, body?: unknown) =>
	app.request(`/settings/hooks${route}${q}`, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

const add = async (name = "Site", url = SECRET_URL) =>
	(await (await call("POST", "", { name, url })).json()) as { id: string };

beforeEach(async () => {
	dir = await mkdtemp(path.join(os.tmpdir(), "hooks-"));
	process.env.SETTINGS_PATH = path.join(dir, "settings.json");
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 204 }));
});

afterEach(async () => {
	vi.unstubAllGlobals();
	delete process.env.SETTINGS_PATH;
	await rm(dir, { recursive: true });
	mark.mockReset();
});

describe("hook routes", () => {
	it("rejects non-https URLs and missing names", async () => {
		expect((await call("POST", "", { name: "Site", url: "http://example.com/x" })).status).toBe(400);
		expect((await call("POST", "", { name: "Site", url: "not a url" })).status).toBe(400);
		expect((await call("POST", "", { name: " ", url: SECRET_URL })).status).toBe(400);
		expect((await call("GET", "")).status).toBe(200);
		expect((await (await call("GET", "")).json()).hooks).toEqual([]);
	});

	it("masks the URL in every response", async () => {
		const { id } = await add();
		await call("PATCH", `/${id}`, { url: `${SECRET_URL}x` });
		const bodies = [
			await (await call("GET", "")).text(),
			await (await call("POST", `/${id}/test`)).text(),
			await (await call("POST", "/deploy")).text(),
			await (await call("PATCH", `/${id}`, { name: "Renamed" })).text(),
		];

		for (const body of bodies) expect(body).not.toContain("abc123secret");
		expect(JSON.parse(bodies[0]).hooks[0]).toMatchObject({
			name: "Site",
			maskedUrl: "example.com/…c2ex",
			lastResult: null,
		});
	});

	it("tests one hook, deploys all, and records the last result", async () => {
		const { id } = await add();

		const tested = await (await call("POST", `/${id}/test`)).json();
		const deployed = await (await call("POST", "/deploy")).json();
		const listed = await (await call("GET", "")).json();

		expect(tested.result.status).toBe(204);
		expect(deployed.results).toHaveLength(1);
		expect(listed.hooks[0].lastResult.status).toBe(204);
		expect(listed.pendingUntil).toBeNull();
	});

	it("renames, replaces the URL and deletes", async () => {
		const { id } = await add();

		expect((await (await call("PATCH", `/${id}`, { name: "New" })).json()).name).toBe("New");
		expect((await call("PATCH", `/${id}`, { url: "http://example.com" })).status).toBe(400);
		expect((await call("DELETE", `/${id}`)).status).toBe(200);
		expect((await call("DELETE", `/${id}`)).status).toBe(404);
		expect((await call("POST", `/${id}/test`)).status).toBe(404);
	});

	it("keeps hooks per bucket", async () => {
		await add();

		const other = await app.request("/settings/hooks?bucket=other&region=r");

		expect((await other.json()).hooks).toEqual([]);
	});
});

describe("markBucketChangedOnWrite", () => {
	const storage = new Hono()
		.use(markBucketChangedOnWrite)
		.get("/collections", (ctx) => ctx.json({}))
		.post("/collections", (ctx) => ctx.json({}, 201))
		.post("/presigned-urls", (ctx) => ctx.json({}))
		.put("/collections/members", (ctx) => ctx.json({ error: "no" }, 400))
		.post("/upload", (ctx) => ctx.json({}));
	const run = (method: string, route: string, init: RequestInit = {}) => storage.request(route, { method, ...init });

	it("marks the bucket after a successful write", async () => {
		await run("POST", "/collections?bucket=b&region=r");

		expect(mark).toHaveBeenCalledWith("b");
	});

	it("takes an upload's bucket from its form", async () => {
		const form = new FormData();
		form.set("bucketName", "from-form");

		await run("POST", "/upload", { body: form });

		expect(mark).toHaveBeenCalledWith("from-form");
	});

	it("ignores reads, presigned URLs and failed writes", async () => {
		await run("GET", "/collections?bucket=b&region=r");
		await run("POST", "/presigned-urls?bucket=b&region=r");
		await run("PUT", "/collections/members?bucket=b&region=r");

		expect(mark).not.toHaveBeenCalled();
	});
});
