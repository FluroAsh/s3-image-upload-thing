import { createHash } from "node:crypto";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { manifestKey, NotAManifestError } from "@/modules/storage/services/manifest";
import { makeJpeg } from "@/modules/storage/test-helpers";
import type { Manifest } from "~/shared/types";

import {
	type BackfillIo,
	countFailed,
	formatSetResult,
	formatWriteTotals,
	type SetResult,
	writeManifests,
} from "./write";

const webp = async (width: number, height: number) =>
	sharp(await makeJpeg({ width, height }))
		.webp()
		.toBuffer();

/** An in-memory bucket holding `files`, the `manifests` already stored in their sets' folders and the keys held by `foreign` files. */
const buckets = (files: Record<string, Buffer>, manifests: Manifest[] = [], foreign: string[] = []) => {
	const stored = new Map(manifests.map((manifest) => [manifestKey(manifest), manifest]));
	const read: string[] = [];

	const io: BackfillIo = {
		readObject: async (key) => {
			read.push(key);
			if (!files[key]) throw new Error("The specified key does not exist.");
			return files[key];
		},
		readManifest: async (location) => {
			if (foreign.includes(manifestKey(location))) throw new NotAManifestError(manifestKey(location));
			return stored.get(manifestKey(location)) ?? null;
		},
		storeManifest: async (manifest, { force }) => {
			if (stored.has(manifestKey(manifest)) && !force) return false;
			stored.set(manifestKey(manifest), manifest);
			return true;
		},
	};

	const objects = Object.entries(files).map(([key, body]) => ({ key, bytes: body.length, etag: `"etag-of-${key}"` }));

	return { io, objects, stored, read };
};

const UNFORCED = { force: false };

const nestedSet = async () => ({
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp": await webp(80, 40),
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp": await webp(144, 72),
});

describe("writeManifests", () => {
	it("stores a manifest for a nested set with each object's measured size, listed bytes and ETag", async () => {
		const files = await nestedSet();
		const { io, objects, stored } = buckets(files);

		const results = await writeManifests(objects, io, UNFORCED);

		expect(results).toEqual([
			{
				layout: "nested",
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				manifestKey: "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json",
				outcome: "written",
			},
		]);
		expect(stored.get("japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json")).toMatchObject({
			schema: 1,
			name: "ginsui-sukiyaki-1",
			folder: "japan-2025/kyoto",
			layout: "nested",
			source: null,
			variants: {
				medium: {
					key: "japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp",
					format: "webp",
					width: 80,
					height: 40,
					bytes: files["japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp"].length,
					etag: '"etag-of-japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp"',
				},
				large: { width: 144, height: 72 },
			},
		});
	});

	it("skips a flat set, which has no folder to hold a manifest, saying it needs migrating and reading none of it", async () => {
		const { io, objects, stored, read } = buckets({
			"DSC_1963_f6f8bf29c4.webp": await webp(200, 100),
			"thumbnail_DSC_1963_f6f8bf29c4.webp": await webp(40, 20),
		});

		const results = await writeManifests(objects, io, { force: true });

		expect(results).toEqual([
			{
				layout: "flat",
				folder: "",
				name: "DSC_1963_f6f8bf29c4",
				outcome: "flat-set",
				detail: "needs migrating into a set folder before it can have a manifest",
			},
		]);
		expect(formatSetResult(results[0])).toBe(
			"[flat-set] flat DSC_1963_f6f8bf29c4: needs migrating into a set folder before it can have a manifest",
		);
		expect(countFailed(results)).toBe(0);
		expect(stored.size).toBe(0);
		expect(read).toEqual([]);
	});

	it("uses the set's own placeholder variant as the manifest's blur, byte for byte", async () => {
		const placeholder = await webp(20, 10);
		const files = {
			...(await nestedSet()),
			"japan-2025/kyoto/ginsui-sukiyaki-1/placeholder_ginsui-sukiyaki-1.webp": placeholder,
		};
		const { io, objects, stored } = buckets(files);

		await writeManifests(objects, io, UNFORCED);

		expect(stored.get("japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json")?.placeholder).toBe(
			`data:image/webp;base64,${placeholder.toString("base64")}`,
		);
	});

	it("makes a 20px blur from the narrowest variant when the set has no placeholder", async () => {
		const { io, objects, stored } = buckets(await nestedSet());

		await writeManifests(objects, io, UNFORCED);

		const { placeholder } = stored.get("japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json") ?? {};
		const [header, base64] = (placeholder ?? "").split(",");
		const { format, width, height } = await sharp(Buffer.from(base64 ?? "", "base64")).metadata();

		expect(header).toBe("data:image/webp;base64");
		expect({ format, width, height }).toEqual({ format: "webp", width: 20, height: 10 });
	});

	it("leaves an existing manifest alone and reads none of the set's objects", async () => {
		const files = await nestedSet();
		const first = buckets(files);
		await writeManifests(first.objects, first.io, UNFORCED);
		const existing = Array.from(first.stored.values());
		const second = buckets(files, existing);

		const results = await writeManifests(second.objects, second.io, UNFORCED);

		expect(results).toMatchObject([{ name: "ginsui-sukiyaki-1", outcome: "exists" }]);
		expect(Array.from(second.stored.values())).toEqual(existing);
		expect(second.read).toEqual([]);
	});

	it("does not count the manifest listed in a set's folder as one of its files: not stale, and never measured", async () => {
		const files = await nestedSet();
		const first = buckets(files);
		await writeManifests(first.objects, first.io, UNFORCED);
		const existing = Array.from(first.stored.values());
		const listedManifest = {
			"japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json": Buffer.from(JSON.stringify(existing[0])),
		};
		const second = buckets({ ...files, ...listedManifest }, existing);

		expect(await writeManifests(second.objects, second.io, UNFORCED)).toMatchObject([{ outcome: "exists" }]);
		expect(await writeManifests(second.objects, second.io, { force: true })).toMatchObject([{ outcome: "written" }]);
		expect(second.read.sort()).toEqual(Object.keys(files).sort());
	});

	describe("a set that keeps its original", () => {
		const ORIGINAL = "japan-2025/kyoto/ginsui-sukiyaki-1/original.jpg";
		const MANIFEST = "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json";

		const withOriginal = async () => ({
			...(await nestedSet()),
			[ORIGINAL]: await makeJpeg({ width: 300, height: 150, orientation: 6 }),
		});

		it("records it as the private source, measured after EXIF rotation, and never as a size", async () => {
			const files = await withOriginal();
			const { io, objects, stored } = buckets(files);

			expect(await writeManifests(objects, io, UNFORCED)).toMatchObject([{ outcome: "written" }]);
			expect(stored.get(MANIFEST)?.source).toEqual({
				key: ORIGINAL,
				public: false,
				sha256: createHash("sha256").update(files[ORIGINAL]).digest("hex"),
				bytes: files[ORIGINAL].length,
				width: 150,
				height: 300,
			});
			expect(Object.keys(stored.get(MANIFEST)?.variants ?? {})).toEqual(["medium", "large"]);
		});

		it("keeps the recorded source when forced, without reading the original again", async () => {
			const files = await withOriginal();
			const first = buckets(files);
			await writeManifests(first.objects, first.io, UNFORCED);
			const recorded = first.stored.get(MANIFEST)?.source;
			const second = buckets(files, Array.from(first.stored.values()));

			expect(await writeManifests(second.objects, second.io, { force: true })).toMatchObject([{ outcome: "written" }]);
			expect(second.stored.get(MANIFEST)?.source).toBe(recorded);
			expect(second.read).not.toContain(ORIGINAL);
		});

		it("is stale while its manifest does not record the original, and records it when forced", async () => {
			const files = await withOriginal();
			const { [ORIGINAL]: _original, ...sizes } = files;
			const first = buckets(sizes);
			await writeManifests(first.objects, first.io, UNFORCED);
			const second = buckets(files, Array.from(first.stored.values()));

			expect(await writeManifests(second.objects, second.io, UNFORCED)).toMatchObject([
				{ outcome: "exists-stale", detail: `its source is ${ORIGINAL}, recorded as none; --force will refresh it` },
			]);
			expect(second.stored.get(MANIFEST)?.source).toBeNull();

			await writeManifests(second.objects, second.io, { force: true });
			expect(second.stored.get(MANIFEST)?.source).toMatchObject({ key: ORIGINAL, public: false });
		});
	});

	describe("a set that gained or lost a variant since its manifest was written", () => {
		const staleSetup = async () => {
			const files = await nestedSet();
			const first = buckets(files);
			await writeManifests(first.objects, first.io, UNFORCED);
			const { "japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp": removed, ...remaining } = files;
			const held = Array.from(first.stored.values());

			return { remaining, held, removed };
		};

		it("is skipped as stale, not failed, and says --force will refresh it", async () => {
			const { remaining, held } = await staleSetup();
			const second = buckets(remaining, held);

			const results = await writeManifests(second.objects, second.io, UNFORCED);

			expect(results).toMatchObject([
				{
					outcome: "exists-stale",
					detail: expect.stringMatching(/removed: .*large_ginsui-sukiyaki-1\.webp.*--force will refresh it/),
				},
			]);
			expect(countFailed(results)).toBe(0);
			expect(Array.from(second.stored.values())).toEqual(held);
			expect(second.read).toEqual([]);
		});

		it("is rewritten without the removed variant when forced", async () => {
			const { remaining, held } = await staleSetup();
			const second = buckets(remaining, held);

			const results = await writeManifests(second.objects, second.io, { ...UNFORCED, force: true });

			expect(results).toMatchObject([{ outcome: "written" }]);
			expect(
				Object.keys(second.stored.get("japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json")?.variants ?? {}),
			).toEqual(["medium"]);
		});
	});

	it("replaces the manifest of the same set when forced", async () => {
		const files = await nestedSet();
		const first = buckets(files);
		await writeManifests(first.objects, first.io, UNFORCED);
		const second = buckets(files, Array.from(first.stored.values()));

		const results = await writeManifests(second.objects, second.io, { ...UNFORCED, force: true });

		expect(results).toMatchObject([{ outcome: "written" }]);
		expect(second.read).toHaveLength(2);
	});

	it("reports a set with an object it cannot read and still writes the others", async () => {
		const { io, objects, stored } = buckets({
			...(await nestedSet()),
			"japan-2025/kyoto/broken/medium_broken.webp": Buffer.from("not an image"),
		});

		const results = await writeManifests(objects, io, UNFORCED);

		expect(results).toMatchObject([
			{ name: "ginsui-sukiyaki-1", outcome: "written" },
			{
				name: "broken",
				outcome: "unreadable-object",
				detail: expect.stringContaining('"japan-2025/kyoto/broken/medium_broken.webp": '),
			},
		]);
		expect(Array.from(stored.keys())).toEqual(["japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json"]);
	});

	it("records the format a .webp key really holds, and says so, rather than describing a JPEG as WebP", async () => {
		const { io, objects, stored } = buckets({
			"static/portrait/medium_portrait.webp": await webp(80, 40),
			"static/portrait/full_portrait.webp": await makeJpeg({ width: 300, height: 600, orientation: 6 }),
		});

		const results = await writeManifests(objects, io, UNFORCED);

		expect(results).toMatchObject([{ outcome: "written", detail: "full holds jpeg, not webp" }]);
		expect(stored.get("static/portrait/manifest.json")?.variants).toMatchObject({
			medium: { format: "webp" },
			full: { format: "jpeg", width: 600, height: 300 },
		});
	});

	it("refuses an object whose size changed since the listing, so stale bytes and ETags are never recorded", async () => {
		const { io, objects, stored } = buckets(await nestedSet());
		const stale = objects.map((object) => ({ ...object, bytes: object.bytes + 1 }));

		const results = await writeManifests(stale, io, UNFORCED);

		expect(results).toMatchObject([
			{ outcome: "unreadable-object", detail: expect.stringContaining("bytes, listed as") },
		]);
		expect(stored.size).toBe(0);
	});

	it("reports a set whose manifest cannot be stored as failed and carries on with the rest", async () => {
		const { io, objects } = buckets({
			...(await nestedSet()),
			"japan-2025/kyoto/second/medium_second.webp": await webp(80, 40),
		});
		const store = io.storeManifest;
		io.storeManifest = async (manifest, options) => {
			if (manifest.name === "ginsui-sukiyaki-1") throw new Error("Access Denied");
			return store(manifest, options);
		};

		const results = await writeManifests(objects, io, UNFORCED);

		expect(results).toMatchObject([
			{ name: "ginsui-sukiyaki-1", outcome: "failed", detail: "Access Denied" },
			{ name: "second", outcome: "written" },
		]);
	});

	describe("a file that is not a set manifest at the manifest key", () => {
		const KEY = "japan-2025/kyoto/ginsui-sukiyaki-1/manifest.json";

		it.each([
			["a plain write", UNFORCED],
			["a forced write", { force: true }],
		])("fails the set under %s, naming the key, and replaces nothing", async (_label, options) => {
			const { io, objects, stored, read } = buckets(await nestedSet(), [], [KEY]);

			const results = await writeManifests(objects, io, options);

			expect(results).toMatchObject([
				{
					outcome: "not-a-manifest",
					detail: `a file that is not a set manifest occupies ${KEY} and was not replaced`,
				},
			]);
			expect(countFailed(results)).toBe(1);
			expect(stored.size).toBe(0);
			expect(read).toEqual([]);
		});

		it("does not stop the other sets", async () => {
			const { io, objects } = buckets(
				{ ...(await nestedSet()), "japan-2025/kyoto/second/medium_second.webp": await webp(80, 40) },
				[],
				[KEY],
			);

			expect(await writeManifests(objects, io, UNFORCED)).toMatchObject([
				{ name: "ginsui-sukiyaki-1", outcome: "not-a-manifest" },
				{ name: "second", outcome: "written" },
			]);
		});
	});

	it("works on at most four sets at a time", async () => {
		const image = await webp(80, 40);
		const names = Array.from({ length: 12 }, (_, index) => `photo-${index}`);
		const { io, objects } = buckets(
			Object.fromEntries(names.map((name) => [`trip/${name}/medium_${name}.webp`, image])),
		);
		let reading = 0;
		let most = 0;
		const read = io.readObject;
		io.readObject = async (key) => {
			most = Math.max(most, ++reading);
			await new Promise((resolve) => setTimeout(resolve, 5));
			reading -= 1;
			return read(key);
		};

		const results = await writeManifests(objects, io, UNFORCED);

		expect(results.map(({ name, outcome }) => [name, outcome])).toEqual(names.map((name) => [name, "written"]));
		expect(most).toBe(4);
	});
});

describe("writeManifests progress", () => {
	it("reports each set to onResult as it finishes, while the results keep listing order", async () => {
		const image = await webp(80, 40);
		const { io, objects } = buckets({
			"trip/slow/medium_slow.webp": image,
			"trip/quick/medium_quick.webp": image,
		});
		const read = io.readObject;
		io.readObject = async (key) => {
			if (key.includes("slow")) await new Promise((resolve) => setTimeout(resolve, 20));
			return read(key);
		};
		const finished: string[] = [];

		const results = await writeManifests(objects, io, UNFORCED, ({ name }) => finished.push(name));

		expect(finished).toEqual(["quick", "slow"]);
		expect(results.map(({ name }) => name)).toEqual(["slow", "quick"]);
	});
});

describe("formatSetResult", () => {
	it("puts the outcome, the set and its detail on one line, ending in the manifest key", () => {
		const set = { layout: "nested", folder: "trip", name: "a", manifestKey: "trip/a/manifest.json" } as const;

		expect(formatSetResult({ ...set, outcome: "written" })).toBe("[written] nested trip/a -> trip/a/manifest.json");
		expect(formatSetResult({ ...set, outcome: "exists-stale", detail: "--force will refresh it" })).toBe(
			"[exists-stale] nested trip/a: --force will refresh it -> trip/a/manifest.json",
		);
	});
});

describe("formatWriteTotals", () => {
	it("counts the sets by outcome, skipped and failed separately", () => {
		const set = (name: string): Pick<SetResult, "layout" | "folder" | "name" | "manifestKey"> => ({
			layout: "nested",
			folder: "trip",
			name,
			manifestKey: `trip/${name}/manifest.json`,
		});

		const report = formatWriteTotals([
			{ ...set("a"), outcome: "written" },
			{ ...set("b"), outcome: "written" },
			{ ...set("c"), outcome: "exists" },
			{ ...set("d"), outcome: "exists-stale", detail: "--force will refresh it" },
			{ ...set("e"), outcome: "unreadable-object", detail: '"trip/e/medium_e.webp": Access Denied' },
			{ ...set("g"), outcome: "not-a-manifest" },
			{ layout: "flat", folder: "", name: "f", outcome: "flat-set" },
		]);

		expect(report).toBe(
			[
				"Sets found: 7",
				"Written: 2",
				"Skipped: 3",
				"  exists: 1",
				"  exists-stale: 1",
				"  flat-set: 1",
				"Failed: 2",
				"  unreadable-object: 1",
				"  not-a-manifest: 1",
				"  failed: 0",
			].join("\n"),
		);
	});
});
