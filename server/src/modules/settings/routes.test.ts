import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import settings from "./routes";
import { cancelPending, markBucketChanged } from "./services/deploy-hooks";

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
	cancelPending("b");
	await rm(dir, { recursive: true });
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
		const added = await call("POST", "", { name: "Site", url: SECRET_URL });
		const { id } = await added.clone().json();
		await call("PATCH", `/${id}`, { url: `${SECRET_URL}x` });
		const bodies = [
			await added.text(),
			await (await call("GET", "")).text(),
			await (await call("POST", `/${id}/test`)).text(),
			await (await call("POST", "/deploy")).text(),
			await (await call("PATCH", `/${id}`, { name: "Renamed" })).text(),
			await (await call("PATCH", `/${id}`, { url: "http://example.com/abc123secret" })).text(),
			await (await call("POST", "", { name: "Other", url: "http://example.com/abc123secret" })).text(),
			await (await call("DELETE", `/${id}`)).text(),
			await (await call("DELETE", `/${id}`)).text(),
		];

		for (const body of bodies) expect(body).not.toContain("abc123secret");
		expect(JSON.parse(bodies[1]).hooks[0]).toMatchObject({
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

	it("forgets a hook's last result only when its URL changes", async () => {
		const { id } = await add();
		await call("POST", `/${id}/test`);

		await call("PATCH", `/${id}`, { name: "Renamed" });
		expect((await (await call("GET", "")).json()).hooks[0].lastResult.status).toBe(204);

		await call("PATCH", `/${id}`, { url: `${SECRET_URL}x` });
		expect((await (await call("GET", "")).json()).hooks[0].lastResult).toBeNull();
	});

	it("cancels the pending deploy when the last hook is deleted, not before", async () => {
		const first = await add();
		const second = await add("Other");
		await markBucketChanged("b");
		const pendingUntil = async () => (await (await call("GET", "")).json()).pendingUntil;

		await call("DELETE", `/${first.id}`);
		expect(await pendingUntil()).not.toBeNull();

		await call("DELETE", `/${second.id}`);
		expect(await pendingUntil()).toBeNull();
	});

	it("keeps hooks per bucket", async () => {
		await add();

		const other = await app.request("/settings/hooks?bucket=other&region=r");

		expect((await other.json()).hooks).toEqual([]);
	});
});
