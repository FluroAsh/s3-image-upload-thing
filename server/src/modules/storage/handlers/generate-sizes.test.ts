import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Manifest } from "~/shared/types";

import { jsonBody, s3 } from "../fake-s3";
import storage from "../routes";
import { makeJpeg } from "../test-helpers";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const SCOPE = "?bucket=test-bucket&region=ap-southeast-2";
const app = new Hono().route("/storage", storage);

const variant = (name: string, width: number) => ({
	key: `trip/a/${name}_a.webp`,
	format: "webp",
	width,
	height: width,
	bytes: 10,
	etag: `"${name}"`,
});

const source = { key: "trip/a/original.jpg", public: false as const, sha256: "x", bytes: 1, width: 1000, height: 1000 };

/** Holds the original and every size above the thumbnail, so `placeholder` and `thumbnail` are missing. */
const manifest = (overrides: Partial<Manifest> = {}): Manifest => ({
	schema: 1,
	name: "a",
	folder: "trip",
	status: "ready",
	createdAt: "2026-01-01T00:00:00.000Z",
	placeholder: null,
	source,
	variants: {
		small: variant("small", 400),
		medium: variant("medium", 800),
		large: variant("large", 1000),
		full: variant("full", 1000),
	},
	...overrides,
});

let stored: Manifest;
let original: Buffer;
let taken: Set<string>;

const puts = () => s3.sent.filter(({ command }) => command === "PutObject");
const manifestPuts = () => puts().filter(({ input }) => input.Key.endsWith("manifest.json"));

beforeEach(async () => {
	s3.sent.length = 0;
	stored = manifest();
	taken = new Set();
	original = await makeJpeg({ width: 1000, height: 1000 });
	s3.respond = async ({ command, input }) => {
		if (command === "GetObject") {
			if (input.Key.endsWith("manifest.json")) return { ETag: '"m"', Body: jsonBody(stored) };
			if (input.Key === source.key) {
				return { ETag: '"o"', Body: { transformToString: async () => "", transformToByteArray: async () => original } };
			}
		}
		if (command === "PutObject" && taken.has(input.Key))
			throw Object.assign(new Error("taken"), { name: "PreconditionFailed" });
		return { ETag: `"etag-of-${input.Key}"` };
	};
});

describe("POST /storage/sizes/:set", () => {
	it("answers 400 without a bucket", async () => {
		expect((await app.request("/storage/sizes/trip/a", { method: "POST" })).status).toBe(400);
	});

	it("writes each missing size create-only, then the manifest last", async () => {
		const res = await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ generated: ["placeholder", "thumbnail"] });
		const keys = puts().map(({ input }) => input.Key);
		expect(keys.slice(0, 2).sort()).toEqual(["trip/a/placeholder_a.webp", "trip/a/thumbnail_a.webp"]);
		expect(keys.at(-1)).toBe("trip/a/manifest.json");
		expect(
			puts()
				.slice(0, 2)
				.every(({ input }) => input.IfNoneMatch === "*"),
		).toBe(true);

		const written = JSON.parse(String(manifestPuts()[0].input.Body)) as Manifest;
		expect(Object.keys(written.variants).sort()).toEqual([
			"full",
			"large",
			"medium",
			"placeholder",
			"small",
			"thumbnail",
		]);
		expect(written.variants.placeholder.width).toBe(20);
		expect(written.placeholder).toMatch(/^data:image\/webp;base64,/);
	});

	it("keeps the placeholder data URI and the placeholder size the same bytes", async () => {
		await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		const sizeBody = puts().find(({ input }) => input.Key === "trip/a/placeholder_a.webp")?.input.Body as Buffer;
		const written = JSON.parse(String(manifestPuts()[0].input.Body)) as Manifest;
		expect(written.placeholder).toBe(`data:image/webp;base64,${sizeBody.toString("base64")}`);
	});

	it("writes nothing when no size is missing", async () => {
		stored = manifest({
			variants: { ...stored.variants, placeholder: variant("placeholder", 20), thumbnail: variant("thumbnail", 120) },
		});
		const res = await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		expect(await res.json()).toEqual({ generated: [] });
		expect(puts()).toHaveLength(0);
	});

	it("skips a size wider than the source", async () => {
		stored = manifest({
			source: { ...source, width: 300, height: 300 },
			variants: { full: variant("full", 300) },
		});
		original = await makeJpeg({ width: 300, height: 300 });
		const res = await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		expect(await res.json()).toEqual({ generated: ["placeholder", "thumbnail"] });
	});

	it("answers 409 when the set keeps no original", async () => {
		stored = manifest({ source: null });
		const res = await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		expect(res.status).toBe(409);
		expect(puts()).toHaveLength(0);
	});

	it("records only the sizes that were stored when one write fails", async () => {
		taken.add("trip/a/thumbnail_a.webp");
		const res = await app.request(`/storage/sizes/trip/a${SCOPE}`, { method: "POST" });

		expect(res.status).toBe(500);
		const written = JSON.parse(String(manifestPuts()[0].input.Body)) as Manifest;
		expect(Object.keys(written.variants)).toContain("placeholder");
		expect(Object.keys(written.variants)).not.toContain("thumbnail");
	});

	it("answers 404 when the set has no manifest", async () => {
		s3.respond = async () => {
			throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
		};
		expect((await app.request(`/storage/sizes/trip/none${SCOPE}`, { method: "POST" })).status).toBe(404);
	});
});
