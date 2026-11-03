import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Collection, CollectionsFile } from "~/shared/types";

import collections from "../collections-routes";
import { s3 } from "../fake-s3";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);
vi.hoisted(() => {
	process.env.COLLECTIONS_BUCKET = "collections-bucket";
	process.env.BUCKET_CDN_PREFIXES = JSON.stringify({ "legacy-bucket": "legacy/" });
});

const app = new Hono().route("/collections", collections);

const collection = (slug: string, sets: string[], extra: Partial<Collection> = {}): Collection => ({
	slug,
	name: slug,
	photos: sets.map((set) => ({ set, alt: null, caption: null, tags: [] })),
	...extra,
});

let current: CollectionsFile;
let manifests: Set<string>;

const send = (method: string, path: string, body?: unknown) =>
	app.request(`/collections${path}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});

const written = () => {
	const put = s3.sent.filter(({ command }) => command === "PutObject").at(-1);
	return JSON.parse(String(put?.input.Body)) as CollectionsFile;
};

beforeEach(() => {
	s3.sent.length = 0;
	current = { schema: 1, updatedAt: "x", collections: [] };
	manifests = new Set();
	s3.respond = async ({ command, input }) => {
		if (command === "GetObject") {
			return {
				ETag: '"v1"',
				Body: {
					transformToString: async () => "",
					transformToByteArray: async () => new Uint8Array(Buffer.from(JSON.stringify(current))),
				},
			};
		}
		if (command === "HeadObject") {
			if (manifests.has(`${input.Bucket}/${input.Key}`)) return {};
			throw Object.assign(new Error("missing"), { name: "NotFound" });
		}
		return { ETag: '"v2"' };
	};
});

describe("GET /collections", () => {
	it("answers the document", async () => {
		current.collections = [collection("tokyo", ["a/b"])];
		const res = await send("GET", "");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(current);
	});
});

describe("POST /collections", () => {
	it("derives a slug from the name and de-duplicates it", async () => {
		current.collections = [collection("tokyo", [])];
		const res = await send("POST", "", { name: "Tōkyō!" });

		expect(res.status).toBe(201);
		expect((await res.json()).collection).toEqual({ slug: "tokyo-2", name: "Tōkyō!", photos: [] });
		expect(written().collections.map(({ slug }) => slug)).toEqual(["tokyo", "tokyo-2"]);
	});

	it.each([{}, { name: "!!!" }, { name: 3 }])("rejects %j with a 400", async (body) => {
		expect((await send("POST", "", body)).status).toBe(400);
	});
});

describe("PUT /collections/members", () => {
	it("moves sets across collections, keeping their text and naming where they came from", async () => {
		current.collections = [
			collection("tokyo", ["trip/a", "trip/b"], { cover: "trip/a" }),
			collection("kyoto", ["trip/c"]),
		];
		current.collections[0].photos[0].alt = "A bridge";
		manifests = new Set(["collections-bucket/trip/a/manifest.json", "collections-bucket/trip/d/manifest.json"]);

		const res = await send("PUT", "/members", { sets: ["trip/d", "trip/a"], collection: "kyoto" });
		const { file, moved } = await res.json();

		expect(res.status).toBe(200);
		expect(moved).toEqual([{ set: "trip/a", from: "tokyo" }]);
		expect(file.collections[0]).toMatchObject({ photos: [{ set: "trip/b" }] });
		expect(file.collections[0].cover).toBeUndefined();
		expect(file.collections[1].photos.map(({ set, alt }: { set: string; alt: string | null }) => [set, alt])).toEqual([
			["trip/c", null],
			["trip/d", null],
			["trip/a", "A bridge"],
		]);
	});

	it("clears sets from their collection without checking manifests", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];
		const res = await send("PUT", "/members", { sets: ["trip/a"], collection: null });

		expect((await res.json()).moved).toEqual([{ set: "trip/a", from: "tokyo" }]);
		expect(written().collections[0].photos).toEqual([]);
		expect(s3.sent.some(({ command }) => command === "HeadObject")).toBe(false);
	});

	it("rejects an unknown set with a 400 naming it, and writes nothing", async () => {
		current.collections = [collection("tokyo", [])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		const res = await send("PUT", "/members", { sets: ["trip/a", "trip/nope"], collection: "tokyo" });

		expect(res.status).toBe(400);
		expect((await res.json()).error).toContain("trip/nope");
		expect(s3.sent.some(({ command }) => command === "PutObject")).toBe(false);
	});

	it("checks a set under a CDN prefix in that prefix's bucket, without the prefix", async () => {
		current.collections = [collection("tokyo", [])];
		manifests = new Set(["legacy-bucket/blog/post/manifest.json"]);

		const res = await send("PUT", "/members", { sets: ["legacy/blog/post"], collection: "tokyo" });

		expect(res.status).toBe(200);
	});

	it("answers 404 for an unknown collection and 400 for a malformed body", async () => {
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		expect((await send("PUT", "/members", { sets: ["trip/a"], collection: "nope" })).status).toBe(404);
		expect((await send("PUT", "/members", { sets: [], collection: null })).status).toBe(400);
		expect((await send("PUT", "/members", { sets: ["x", "x"], collection: null })).status).toBe(400);
	});
});

describe("PATCH /collections/members/:set", () => {
	it("changes only the given fields of a set's photo", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];
		const res = await send("PATCH", "/members/trip/a", { alt: "A bridge", tags: ["night"] });

		expect(res.status).toBe(200);
		expect((await res.json()).photo).toEqual({ set: "trip/a", alt: "A bridge", caption: null, tags: ["night"] });
		expect(written().collections[0].photos[0].alt).toBe("A bridge");
	});

	it("answers 404 for a set in no collection and 400 for bad text", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];

		expect((await send("PATCH", "/members/trip/z", { alt: "x" })).status).toBe(404);
		expect((await send("PATCH", "/members/trip/a", { tags: "x" })).status).toBe(400);
	});
});
