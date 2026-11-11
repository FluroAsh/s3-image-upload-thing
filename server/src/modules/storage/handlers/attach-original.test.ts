import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORIGINAL_FIELD } from "~/shared/constants/upload";
import type { Manifest } from "~/shared/types";

import { jsonBody, s3 } from "../fake-s3";
import storage from "../routes";
import { makeJpeg } from "../test-helpers";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const SCOPE = "?bucket=test-bucket&region=ap-southeast-2";
const app = new Hono().route("/storage", storage);

const variant = (name: string, width: number, height: number) => ({
	key: `trip/a/${name}_a.webp`,
	format: "webp",
	width,
	height,
	bytes: 10,
	etag: `"${name}"`,
});

/** A landscape set with no source, whose largest size is 800x600 and whose other sizes are missing. */
const legacy = (): Manifest => ({
	schema: 1,
	name: "a",
	folder: "trip",
	status: "ready",
	createdAt: "2026-01-01T00:00:00.000Z",
	placeholder: null,
	source: null,
	variants: { medium: variant("medium", 800, 600), large: variant("large", 800, 600) },
});

let stored: Manifest;

const puts = () => s3.sent.filter(({ command }) => command === "PutObject");

const send = async (image: Buffer, name = "photo.jpg") => {
	const form = new FormData();
	form.append(ORIGINAL_FIELD, new File([new Uint8Array(image)], name, { type: "image/jpeg" }));
	return app.request(`/storage/original/trip/a${SCOPE}`, { method: "POST", body: form });
};

beforeEach(() => {
	s3.sent.length = 0;
	stored = legacy();
	s3.respond = async ({ command, input }) => {
		if (command === "GetObject" && input.Key.endsWith("manifest.json")) return { ETag: '"m"', Body: jsonBody(stored) };
		return { ETag: `"etag-of-${input.Key}"` };
	};
});

describe("POST /storage/original/:set", () => {
	it("answers 400 without a bucket", async () => {
		expect((await app.request("/storage/original/trip/a", { method: "POST" })).status).toBe(400);
	});

	it("stores a matching original create-only, records it as the source and fills the missing sizes", async () => {
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }));

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ generated: ["placeholder", "thumbnail", "small", "full"] });
		const [original, ...rest] = puts();
		expect(original.input.Key).toBe("trip/a/original.jpg");
		expect(original.input.IfNoneMatch).toBe("*");
		const sizes = rest.filter(({ input }) => !input.Key.endsWith("manifest.json"));
		expect(sizes.map(({ input }) => input.Key).sort()).toEqual([
			"trip/a/full_a.webp",
			"trip/a/placeholder_a.webp",
			"trip/a/small_a.webp",
			"trip/a/thumbnail_a.webp",
		]);
		expect(sizes.every(({ input }) => input.IfNoneMatch === "*")).toBe(true);
		expect(
			puts().some(({ input }) => ["medium", "large"].some((name) => input.Key.startsWith(`trip/a/${name}_`))),
		).toBe(false);

		const manifests = puts().filter(({ input }) => input.Key.endsWith("manifest.json"));
		const written = JSON.parse(String(manifests.at(-1)?.input.Body)) as Manifest;
		expect(written.source).toMatchObject({ key: "trip/a/original.jpg", width: 1600, height: 1200 });
		expect(written.variants.large.etag).toBe('"large"');
	});

	it("accepts a rotated original whose displayed ratio matches", async () => {
		const res = await send(await makeJpeg({ width: 1200, height: 1600, orientation: 6 }));

		expect(res.status).toBe(200);
		expect(puts()[0].input.Key).toBe("trip/a/original.jpg");
	});

	it("rejects an original of another ratio with 422 and writes nothing", async () => {
		const res = await send(await makeJpeg({ width: 1200, height: 1200 }));

		expect(res.status).toBe(422);
		expect(puts()).toHaveLength(0);
	});

	it("rejects a sideways original that only matches before rotation", async () => {
		const res = await send(await makeJpeg({ width: 1600, height: 1200, orientation: 6 }));

		expect(res.status).toBe(422);
		expect(puts()).toHaveLength(0);
	});

	it("rejects an original smaller than the largest existing size with 422 and writes nothing", async () => {
		const res = await send(await makeJpeg({ width: 400, height: 300 }));

		expect(res.status).toBe(422);
		expect(puts()).toHaveLength(0);
	});

	it("names the original after its detected format, not its file name", async () => {
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }), "photo.png");

		expect(res.status).toBe(200);
		expect(puts()[0].input).toMatchObject({ Key: "trip/a/original.jpg", ContentType: "image/jpeg" });
	});

	it("deletes the stored original and surfaces the error when the manifest write fails", async () => {
		const respond = s3.respond;
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.Key.endsWith("manifest.json")) throw new Error("manifest down");
			return respond(sent);
		};
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }));

		expect(res.status).toBe(500);
		expect(s3.sent.filter(({ command }) => command === "DeleteObject").map(({ input }) => input.Key)).toEqual([
			"trip/a/original.jpg",
		]);
	});

	it("rejects a file that is not an image with 422", async () => {
		const res = await send(Buffer.from("not an image"));

		expect(res.status).toBe(422);
		expect(puts()).toHaveLength(0);
	});

	it("answers 409 when the set already keeps an original", async () => {
		stored = {
			...legacy(),
			source: { key: "trip/a/original.jpg", public: false, sha256: "x", bytes: 1, width: 800, height: 600 },
		};
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }));

		expect(res.status).toBe(409);
		expect(puts()).toHaveLength(0);
	});

	it("answers 409 when the set has no size to compare against", async () => {
		stored = { ...legacy(), variants: {} };
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }));

		expect(res.status).toBe(409);
		expect(puts()).toHaveLength(0);
	});

	it("answers 409 and keeps the manifest when an original already sits at the key", async () => {
		const respond = s3.respond;
		s3.respond = async (sent) => {
			if (sent.command === "PutObject" && sent.input.Key === "trip/a/original.jpg")
				throw Object.assign(new Error("taken"), { name: "PreconditionFailed" });
			return respond(sent);
		};
		const res = await send(await makeJpeg({ width: 1600, height: 1200 }));

		expect(res.status).toBe(409);
		expect(puts().some(({ input }) => input.Key.endsWith("manifest.json"))).toBe(false);
	});
});
