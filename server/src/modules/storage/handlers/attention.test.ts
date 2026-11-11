import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AttentionResponse } from "~/shared/types";

import { jsonBody, s3 } from "../fake-s3";
import storage from "../routes";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const app = new Hono().route("/storage", storage);
const SCOPE = "bucket=test-bucket&region=ap-southeast-2";

const file = (name: string, size: string, width: number, etag = `${size}-${name}`) => ({
	key: `trip/${name}/${size}_${name}.webp`,
	format: "webp",
	width,
	height: width,
	bytes: 1,
	etag,
});

/** A complete 1000px set, minus the sizes named in `drop`. */
const manifestOf = (name: string, drop: string[] = []) => ({
	schema: 1,
	name,
	folder: "trip",
	variants: Object.fromEntries(
		[
			["placeholder", 20],
			["thumbnail", 200],
			["small", 400],
			["medium", 800],
			["large", 1000],
			["full", 1000],
		]
			.filter(([size]) => !drop.includes(size as string))
			.map(([size, width]) => [size, file(name, size as string, width as number)]),
	),
});

let manifests: Record<string, unknown>;
let keys: string[];

/** Lists a webp for every set, plus a manifest key for those that have one. */
const stock = (sets: Record<string, unknown | null>) => {
	manifests = {};
	keys = [];
	for (const [name, manifest] of Object.entries(sets)) {
		keys.push(`trip/${name}/full_${name}.webp`);
		if (manifest) {
			keys.push(`trip/${name}/manifest.json`);
			manifests[`trip/${name}/manifest.json`] = manifest;
		}
	}
};

const attention = async (query = ""): Promise<AttentionResponse> =>
	(await app.request(`/storage/attention?${SCOPE}&folder=trip${query}`)).json();

beforeEach(() => {
	s3.sent.length = 0;
	s3.respond = async ({ command, input }) => {
		if (command === "ListObjectsV2") return { Contents: keys.map((Key) => ({ Key })), IsTruncated: false };
		const found = manifests[input.Key];
		if (!found) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
		return { ETag: '"v1"', Body: jsonBody(found) };
	};
});

describe("GET /storage/attention", () => {
	it("answers 400 without a bucket", async () => {
		expect((await app.request("/storage/attention")).status).toBe(400);
	});

	it("lists a set with no manifest as such", async () => {
		stock({ legacy: null, fine: manifestOf("fine") });

		const { sets } = await attention();

		expect(sets).toEqual([
			{
				name: "legacy",
				set: "trip/legacy",
				manifest: "none",
				hasOriginal: false,
				problems: ["placeholder", "thumbnail", "small", "medium", "large"].map((name) => ({ name, state: "missing" })),
			},
		]);
	});

	it("names the missing and mismatched sizes and whether an original is held", async () => {
		const copied = manifestOf("odd");
		copied.variants.large = { ...copied.variants.large, etag: copied.variants.medium.etag };
		stock({ gap: manifestOf("gap", ["thumbnail", "small"]), odd: copied, fine: manifestOf("fine") });
		keys.push("trip/gap/original.jpg");

		const { sets, total } = await attention();

		expect(total).toBe(3);
		expect(sets).toEqual([
			{
				name: "gap",
				set: "trip/gap",
				manifest: "present",
				hasOriginal: true,
				problems: [
					{ name: "thumbnail", state: "missing" },
					{ name: "small", state: "missing" },
				],
			},
			{
				name: "odd",
				set: "trip/odd",
				manifest: "present",
				hasOriginal: false,
				problems: [{ name: "large", state: "mismatched", reason: "same file as medium" }],
			},
		]);
	});

	it("flags an unreadable manifest instead of failing", async () => {
		stock({ odd: { hello: "world" } });

		expect((await attention()).sets[0].manifest).toBe("notAManifest");
	});

	it("includes sets that need nothing when asked for all", async () => {
		stock({ a: manifestOf("a"), b: null });

		expect((await attention("&all=true")).sets.map(({ name }) => name)).toEqual(["a", "b"]);
	});

	it("pages through sets needing attention by cursor, skipping those that do not", async () => {
		stock(Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`s${i}`, i % 2 ? manifestOf(`s${i}`) : null])));

		const first = await attention();
		const second = await attention(`&cursor=${first.nextCursor}`);

		expect([first.sets.length, second.sets.length]).toEqual([50, 10]);
		expect(first.nextCursor).not.toBeNull();
		expect(second.nextCursor).toBeNull();
		expect(new Set([...first.sets, ...second.sets].map(({ name }) => name)).size).toBe(60);
	});

	it("reads a folder's manifests with bounded concurrency", async () => {
		stock(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`s${i}`, manifestOf(`s${i}`)])));
		let active = 0;
		let peak = 0;
		const respond = s3.respond;
		s3.respond = async (sent) => {
			if (sent.command !== "GetObject") return respond(sent);
			active += 1;
			peak = Math.max(peak, active);
			await new Promise((resolve) => setTimeout(resolve, 1));
			active -= 1;
			return respond(sent);
		};

		await attention();

		expect(peak).toBeGreaterThan(1);
		expect(peak).toBeLessThanOrEqual(16);
	});
});
