import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Collection, CollectionsFile } from "~/shared/types";

import { jsonBody, s3 } from "../fake-s3";
import storage from "../routes";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const app = new Hono().route("/storage", storage);

const collection = (slug: string, sets: string[], extra: Partial<Collection> = {}): Collection => ({
	slug,
	name: slug,
	photos: sets.map((set) => ({ set, alt: null, caption: null, tags: [] })),
	...extra,
});

let current: CollectionsFile;
let manifests: Set<string>;

const SCOPE = "bucket=collections-bucket&region=ap-southeast-2";

const send = (method: string, path: string, body?: unknown, scope = SCOPE) =>
	app.request(`/storage/collections${path}?${scope}`, {
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
			return { ETag: '"v1"', Body: jsonBody(current) };
		}
		if (command === "HeadObject") {
			if (manifests.has(`${input.Bucket}/${input.Key}`)) return {};
			throw Object.assign(new Error("missing"), { name: "NotFound" });
		}
		return { ETag: '"v2"' };
	};
});

describe("GET /storage/collections", () => {
	it("answers the document", async () => {
		current.collections = [collection("tokyo", ["a/b"])];
		const res = await send("GET", "");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(current);
	});

	it("reads the bucket named in the query", async () => {
		await send("GET", "", undefined, "bucket=other-bucket&region=us-east-1");

		expect(s3.sent.at(-1)?.input.Bucket).toBe("other-bucket");
	});

	it("answers 400 when the bucket or region is missing", async () => {
		expect((await send("GET", "", undefined, "bucket=collections-bucket")).status).toBe(400);
	});

	it("lists none for a bucket with no collections file, and the first create makes it", async () => {
		const missing = Object.assign(new Error("missing"), { name: "NoSuchKey" });
		const respond = s3.respond;
		s3.respond = async (call) => {
			if (call.command === "GetObject") throw missing;
			return respond(call);
		};
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		expect((await (await send("GET", "")).json()).collections).toEqual([]);
		expect((await send("POST", "", { name: "Tokyo", sets: ["trip/a"] })).status).toBe(201);
		const put = s3.sent.filter(({ command }) => command === "PutObject").at(-1);
		expect(put?.input.IfNoneMatch).toBe("*");
	});
});

describe("POST /storage/collections", () => {
	it("creates a collection from sets, de-duplicating the slug and moving sets out of their collection", async () => {
		current.collections = [collection("tokyo", ["trip/a", "trip/b"]), collection("tokyo-1", ["trip/c"])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json", "collections-bucket/trip/d/manifest.json"]);
		current.collections[0].photos[0].alt = "A bridge";
		const res = await send("POST", "", { name: "Tōkyō!", sets: ["trip/d", "trip/a"] });
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.moved).toEqual([{ set: "trip/a", from: "tokyo" }]);
		expect(body.collection.slug).toBe("tokyo-2");
		expect(body.collection.photos.map(({ set, alt }: { set: string; alt: string | null }) => [set, alt])).toEqual([
			["trip/d", null],
			["trip/a", "A bridge"],
		]);
		expect(written().collections.map(({ slug }) => slug)).toEqual(["tokyo", "tokyo-1", "tokyo-2"]);
		expect(s3.sent.filter(({ command }) => command === "PutObject")).toHaveLength(1);
	});

	it("removes a collection whose last photo moves out", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);
		await send("POST", "", { name: "Kyoto", sets: ["trip/a"] });

		expect(written().collections.map(({ slug }) => slug)).toEqual(["kyoto"]);
	});

	it.each([
		{},
		{ name: "!!!", sets: ["x"] },
		{ name: 3, sets: ["x"] },
		{ name: "Tokyo" },
		{ name: "Tokyo", sets: [] },
		{ name: "Tokyo", sets: [1] },
	])("rejects %j with a 400", async (body) => {
		expect((await send("POST", "", body)).status).toBe(400);
	});

	it("rejects an unknown set with a 400", async () => {
		expect((await send("POST", "", { name: "Tokyo", sets: ["trip/nope"] })).status).toBe(400);
	});
});

describe("PUT /storage/collections/members", () => {
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
		expect(written().collections).toEqual([]);
		expect(s3.sent.some(({ command }) => command === "HeadObject")).toBe(false);
	});

	it("removes the source collection when its last photo moves out", async () => {
		current.collections = [collection("tokyo", ["trip/a"]), collection("kyoto", ["trip/c"])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		await send("PUT", "/members", { sets: ["trip/a"], collection: "kyoto" });

		expect(written().collections.map(({ slug }) => slug)).toEqual(["kyoto"]);
	});

	it("rejects an unknown set with a 400 naming it, and writes nothing", async () => {
		current.collections = [collection("tokyo", ["trip/z"])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		const res = await send("PUT", "/members", { sets: ["trip/a", "trip/nope"], collection: "tokyo" });

		expect(res.status).toBe(400);
		expect((await res.json()).error).toContain("trip/nope");
		expect(s3.sent.some(({ command }) => command === "PutObject")).toBe(false);
	});

	it("answers 404 for an unknown collection and 400 for a malformed body", async () => {
		current.collections = [collection("tokyo", ["trip/z"])];
		manifests = new Set(["collections-bucket/trip/a/manifest.json"]);

		expect((await send("PUT", "/members", { sets: ["trip/a"], collection: "nope" })).status).toBe(404);
		expect((await send("PUT", "/members", { sets: [], collection: null })).status).toBe(400);
		expect((await send("PUT", "/members", { sets: ["trip/a", "trip/a"], collection: "tokyo" })).status).toBe(400);
	});
});

describe("PATCH /storage/collections/members/:set", () => {
	it("changes only the given fields of a set's photo", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];
		const res = await send("PATCH", "/members/trip/a", { alt: "A bridge", tags: ["night"] });

		expect(res.status).toBe(200);
		expect((await res.json()).photo).toEqual({ set: "trip/a", alt: "A bridge", caption: null, tags: ["night"] });
		expect(written().collections[0].photos[0].alt).toBe("A bridge");
	});

	it("patches a set path with several slashes", async () => {
		current.collections = [collection("tokyo", ["japan-2025/tokyo/day-1/x"])];
		const res = await send("PATCH", "/members/japan-2025/tokyo/day-1/x", { caption: "Dusk" });

		expect(res.status).toBe(200);
		expect((await res.json()).photo).toMatchObject({ set: "japan-2025/tokyo/day-1/x", caption: "Dusk" });
	});

	it("answers 404 for a set in no collection and 400 for bad text", async () => {
		current.collections = [collection("tokyo", ["trip/a"])];

		expect((await send("PATCH", "/members/trip/z", { alt: "x" })).status).toBe(404);
		expect((await send("PATCH", "/members/trip/a", { tags: "x" })).status).toBe(400);
	});
});

describe("PATCH /storage/collections/:slug", () => {
	it("renames without changing the slug", async () => {
		current.collections = [collection("tokyo", ["trip/a"], { cover: "trip/a" })];
		const res = await send("PATCH", "/tokyo", { name: " Tokyo trip " });

		expect(res.status).toBe(200);
		expect((await res.json()).collection).toMatchObject({ slug: "tokyo", name: "Tokyo trip", cover: "trip/a" });
	});

	it("sets and clears the cover", async () => {
		current.collections = [collection("tokyo", ["trip/a", "trip/b"])];
		expect((await (await send("PATCH", "/tokyo", { cover: "trip/b" })).json()).collection.cover).toBe("trip/b");

		current.collections[0].cover = "trip/b";
		const cleared = (await (await send("PATCH", "/tokyo", { cover: null })).json()).collection;
		expect(cleared).not.toHaveProperty("cover");
		expect(written().collections[0]).not.toHaveProperty("cover");
	});

	it("answers 400 for a cover outside the collection or bad text, and 404 for an unknown slug", async () => {
		current.collections = [collection("tokyo", ["trip/a"]), collection("kyoto", ["trip/b"])];

		expect((await send("PATCH", "/tokyo", { cover: "trip/b" })).status).toBe(400);
		expect((await send("PATCH", "/tokyo", { name: " " })).status).toBe(400);
		expect((await send("PATCH", "/tokyo", { name: "!!!" })).status).toBe(400);
		expect((await send("PATCH", "/nowhere", { name: "x" })).status).toBe(404);
	});
});

describe("DELETE /storage/collections/:slug", () => {
	it("removes the collection and answers 404 for an unknown slug", async () => {
		current.collections = [collection("tokyo", ["trip/a"]), collection("kyoto", ["trip/b"])];
		const res = await send("DELETE", "/tokyo");

		expect(res.status).toBe(200);
		expect(written().collections.map(({ slug }) => slug)).toEqual(["kyoto"]);
		expect((await send("DELETE", "/nowhere")).status).toBe(404);
	});
});

describe("PUT /storage/collections/:slug/order", () => {
	it("reorders the photos, keeping their text", async () => {
		current.collections = [collection("tokyo", ["trip/a", "trip/b"])];
		current.collections[0].photos[0].alt = "A bridge";
		const res = await send("PUT", "/tokyo/order", { sets: ["trip/b", "trip/a"] });

		expect(res.status).toBe(200);
		expect((await res.json()).collection.photos.map(({ set }: { set: string }) => set)).toEqual(["trip/b", "trip/a"]);
		expect(written().collections[0].photos[1].alt).toBe("A bridge");
	});

	it("answers 400 for an order that adds, drops or repeats sets, and 404 for an unknown slug", async () => {
		current.collections = [collection("tokyo", ["trip/a", "trip/b"])];

		expect((await send("PUT", "/tokyo/order", { sets: ["trip/a", "trip/b", "trip/c"] })).status).toBe(400);
		expect((await send("PUT", "/tokyo/order", { sets: ["trip/a"] })).status).toBe(400);
		expect((await send("PUT", "/tokyo/order", { sets: ["trip/a", "trip/a"] })).status).toBe(400);
		expect((await send("PUT", "/tokyo/order", {})).status).toBe(400);
		expect((await send("PUT", "/nowhere/order", { sets: [] })).status).toBe(404);
		expect(s3.sent.some(({ command }) => command === "PutObject")).toBe(false);
	});
});
