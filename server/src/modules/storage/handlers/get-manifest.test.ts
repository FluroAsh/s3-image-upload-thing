import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonBody, s3 } from "../fake-s3";
import storage from "../routes";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);
vi.hoisted(() => {
	process.env.COLLECTIONS_BUCKET = "collections-bucket";
});

const app = new Hono().route("/storage", storage);
const stored = { schema: 1, name: "a", folder: "trip", variants: {} };

let objects: Record<string, unknown>;

beforeEach(() => {
	s3.sent.length = 0;
	objects = {};
	s3.respond = async ({ input }) => {
		const found = objects[`${input.Bucket}/${input.Key}`];
		if (!found) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
		return { ETag: '"v1"', Body: jsonBody(found) };
	};
});

describe("GET /storage/manifests/:set", () => {
	it("returns the manifest stored beside a set", async () => {
		objects["collections-bucket/trip/a/manifest.json"] = stored;
		const res = await app.request("/storage/manifests/trip/a");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(stored);
	});

	it("answers 404 when the set has no manifest", async () => {
		expect((await app.request("/storage/manifests/trip/none")).status).toBe(404);
	});

	it("answers 422 rather than 500 when the file is not a manifest", async () => {
		objects["collections-bucket/trip/odd/manifest.json"] = { hello: "world" };
		const res = await app.request("/storage/manifests/trip/odd");

		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "Not a readable manifest" });
	});
});
