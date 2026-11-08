import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { s3 } from "../fake-s3";
import storage from "../routes";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);
vi.hoisted(() => {
	process.env.COLLECTIONS_BUCKET = "collections-bucket";
	process.env.BUCKET_CDN_PREFIXES = JSON.stringify({ "legacy-bucket": "legacy/" });
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
		return {
			ETag: '"v1"',
			Body: {
				transformToString: async () => "",
				transformToByteArray: async () => new Uint8Array(Buffer.from(JSON.stringify(found))),
			},
		};
	};
});

describe("GET /storage/manifests/:set", () => {
	it("returns the manifest stored beside a set", async () => {
		objects["collections-bucket/trip/a/manifest.json"] = stored;
		const res = await app.request("/storage/manifests/trip/a");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(stored);
	});

	it("reads a set under a CDN prefix from its own bucket", async () => {
		objects["legacy-bucket/blog/post/manifest.json"] = stored;

		expect((await app.request("/storage/manifests/legacy/blog/post")).status).toBe(200);
	});

	it("answers 404 when the set has no manifest", async () => {
		expect((await app.request("/storage/manifests/trip/none")).status).toBe(404);
	});
});
