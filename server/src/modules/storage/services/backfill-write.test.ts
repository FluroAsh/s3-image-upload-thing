import { createHash } from "node:crypto";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { Manifest } from "~/shared/types";

import { makeJpeg } from "../test-helpers";
import {
	type BackfillIo,
	formatWriteReport,
	parseBackfillArgs,
	type SetResult,
	writeManifests,
} from "./backfill-write";
import { manifestKey } from "./manifest";

const webp = async (width: number, height: number) =>
	sharp(await makeJpeg({ width, height }))
		.webp()
		.toBuffer();

/** An in-memory read bucket holding `files`, and a manifest bucket that starts with `manifests`. */
const buckets = (files: Record<string, Buffer>, manifests: Manifest[] = []) => {
	const stored = new Map(manifests.map((manifest) => [manifestKey(manifest), manifest]));
	const read: string[] = [];

	const io: BackfillIo = {
		readObject: async (key) => {
			read.push(key);
			if (!files[key]) throw new Error("The specified key does not exist.");
			return files[key];
		},
		readManifest: async (location) => stored.get(manifestKey(location)) ?? null,
		storeManifest: async (manifest, { overwrite }) => {
			if (stored.has(manifestKey(manifest)) && !overwrite) return false;
			stored.set(manifestKey(manifest), manifest);
			return true;
		},
	};

	const objects = Object.entries(files).map(([key, body]) => ({ key, bytes: body.length, etag: `"etag-of-${key}"` }));

	return { io, objects, stored, read };
};

const PRIMARY = { bucket: "example-bucket", pathPrefix: "", force: false };

const nestedSet = async () => ({
	"japan-2025/kyoto/ginsui-sukiyaki-1/medium_ginsui-sukiyaki-1.webp": await webp(80, 40),
	"japan-2025/kyoto/ginsui-sukiyaki-1/large_ginsui-sukiyaki-1.webp": await webp(144, 72),
});

describe("writeManifests", () => {
	it("stores a manifest for a nested set with each object's measured size, listed bytes and ETag", async () => {
		const files = await nestedSet();
		const { io, objects, stored } = buckets(files);

		const results = await writeManifests(objects, io, PRIMARY);

		expect(results).toEqual([
			{
				layout: "nested",
				folder: "japan-2025/kyoto",
				name: "ginsui-sukiyaki-1",
				manifestKey: "manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json",
				outcome: "written",
			},
		]);
		expect(stored.get("manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json")).toMatchObject({
			schema: 1,
			name: "ginsui-sukiyaki-1",
			folder: "japan-2025/kyoto",
			bucket: "example-bucket",
			pathPrefix: "",
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

	it("records a flat set's un-prefixed original as its public source, hashed from the bytes read", async () => {
		const files = {
			"DSC_1963_f6f8bf29c4.webp": await webp(200, 100),
			"thumbnail_DSC_1963_f6f8bf29c4.webp": await webp(40, 20),
		};
		const { io, objects, stored } = buckets(files);

		await writeManifests(objects, io, { bucket: "example-legacy-bucket", pathPrefix: "legacy/", force: false });

		const manifest = stored.get("manifests/legacy/DSC_1963_f6f8bf29c4.json");
		expect(manifest).toMatchObject({
			bucket: "example-legacy-bucket",
			pathPrefix: "legacy/",
			layout: "flat",
			folder: "",
		});
		expect(manifest?.source).toEqual({
			key: "DSC_1963_f6f8bf29c4.webp",
			public: true,
			sha256: createHash("sha256").update(files["DSC_1963_f6f8bf29c4.webp"]).digest("hex"),
			bytes: files["DSC_1963_f6f8bf29c4.webp"].length,
			width: 200,
			height: 100,
		});
		expect(Object.keys(manifest?.variants ?? {})).toEqual(["original", "thumbnail"]);
	});

	it("uses the set's own placeholder variant as the manifest's blur, byte for byte", async () => {
		const placeholder = await webp(20, 10);
		const files = {
			...(await nestedSet()),
			"japan-2025/kyoto/ginsui-sukiyaki-1/placeholder_ginsui-sukiyaki-1.webp": placeholder,
		};
		const { io, objects, stored } = buckets(files);

		await writeManifests(objects, io, PRIMARY);

		expect(stored.get("manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json")?.placeholder).toBe(
			`data:image/webp;base64,${placeholder.toString("base64")}`,
		);
	});

	it("makes a 20px blur from the narrowest variant when the set has no placeholder", async () => {
		const { io, objects, stored } = buckets(await nestedSet());

		await writeManifests(objects, io, PRIMARY);

		const { placeholder } = stored.get("manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json") ?? {};
		const [header, base64] = (placeholder ?? "").split(",");
		const { format, width, height } = await sharp(Buffer.from(base64 ?? "", "base64")).metadata();

		expect(header).toBe("data:image/webp;base64");
		expect({ format, width, height }).toEqual({ format: "webp", width: 20, height: 10 });
	});

	it("leaves an existing manifest alone and reads none of the set's objects", async () => {
		const files = await nestedSet();
		const first = buckets(files);
		await writeManifests(first.objects, first.io, PRIMARY);
		const existing = Array.from(first.stored.values());
		const second = buckets(files, existing);

		const results = await writeManifests(second.objects, second.io, PRIMARY);

		expect(results).toMatchObject([{ name: "ginsui-sukiyaki-1", outcome: "exists" }]);
		expect(Array.from(second.stored.values())).toEqual(existing);
		expect(second.read).toEqual([]);
	});

	it("says so when the existing manifest describes a different set", async () => {
		const flat = { "japan-2025/kyoto/ginsui-sukiyaki-1.webp": await webp(200, 100) };
		const first = buckets(flat);
		await writeManifests(first.objects, first.io, PRIMARY);
		const second = buckets(await nestedSet(), Array.from(first.stored.values()));

		const results = await writeManifests(second.objects, second.io, PRIMARY);

		expect(results).toMatchObject([
			{
				layout: "nested",
				name: "ginsui-sukiyaki-1",
				outcome: "exists-other-set",
				detail: "existing manifest is a flat set in example-bucket with keys japan-2025/kyoto/ginsui-sukiyaki-1.webp",
			},
		]);
		expect(second.stored.get("manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json")?.layout).toBe("flat");
	});

	it("rewrites an existing manifest when forced", async () => {
		const stale = { "japan-2025/kyoto/ginsui-sukiyaki-1.webp": await webp(200, 100) };
		const first = buckets(stale);
		await writeManifests(first.objects, first.io, PRIMARY);
		const second = buckets(await nestedSet(), Array.from(first.stored.values()));

		const results = await writeManifests(second.objects, second.io, { ...PRIMARY, force: true });

		expect(results).toMatchObject([{ outcome: "written" }]);
		expect(second.stored.get("manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json")?.layout).toBe("nested");
	});

	it("reports a set with an object it cannot read and still writes the others", async () => {
		const { io, objects, stored } = buckets({
			...(await nestedSet()),
			"japan-2025/kyoto/broken/medium_broken.webp": Buffer.from("not an image"),
		});

		const results = await writeManifests(objects, io, PRIMARY);

		expect(results).toMatchObject([
			{ name: "ginsui-sukiyaki-1", outcome: "written" },
			{
				name: "broken",
				outcome: "unreadable-object",
				detail: expect.stringContaining('"japan-2025/kyoto/broken/medium_broken.webp": '),
			},
		]);
		expect(Array.from(stored.keys())).toEqual(["manifests/japan-2025/kyoto/ginsui-sukiyaki-1.json"]);
	});

	it("records the format a .webp key really holds, and says so, rather than describing a JPEG as WebP", async () => {
		const { io, objects, stored } = buckets({
			"static/portrait/medium_portrait.webp": await webp(80, 40),
			"static/portrait/lossless_portrait.webp": await makeJpeg({ width: 300, height: 600, orientation: 6 }),
		});

		const results = await writeManifests(objects, io, PRIMARY);

		expect(results).toMatchObject([{ outcome: "written", detail: "lossless holds jpeg, not webp" }]);
		expect(stored.get("manifests/static/portrait.json")?.variants).toMatchObject({
			medium: { format: "webp" },
			lossless: { format: "jpeg", width: 600, height: 300 },
		});
	});

	it("refuses an object whose size changed since the listing, so stale bytes and ETags are never recorded", async () => {
		const { io, objects, stored } = buckets(await nestedSet());
		const stale = objects.map((object) => ({ ...object, bytes: object.bytes + 1 }));

		const results = await writeManifests(stale, io, PRIMARY);

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

		const results = await writeManifests(objects, io, PRIMARY);

		expect(results).toMatchObject([
			{ name: "ginsui-sukiyaki-1", outcome: "failed", detail: "Access Denied" },
			{ name: "second", outcome: "written" },
		]);
	});

	it("writes neither of two sets in one run that map to the same manifest key, even when forced", async () => {
		const { io, objects, stored } = buckets({
			...(await nestedSet()),
			"japan-2025/kyoto/ginsui-sukiyaki-1.webp": await webp(200, 100),
		});

		const results = await writeManifests(objects, io, { ...PRIMARY, force: true });

		expect(results).toMatchObject([
			{
				layout: "nested",
				outcome: "collision",
				detail: "shares its manifest key with flat japan-2025/kyoto/ginsui-sukiyaki-1",
			},
			{
				layout: "flat",
				outcome: "collision",
				detail: "shares its manifest key with nested japan-2025/kyoto/ginsui-sukiyaki-1",
			},
		]);
		expect(stored.size).toBe(0);
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

		const results = await writeManifests(objects, io, PRIMARY);

		expect(results.map(({ name, outcome }) => [name, outcome])).toEqual(names.map((name) => [name, "written"]));
		expect(most).toBe(4);
	});
});

describe("formatWriteReport", () => {
	it("lists every set with what happened to it, then totals by outcome", () => {
		const set = (name: string): Pick<SetResult, "layout" | "folder" | "name" | "manifestKey"> => ({
			layout: "nested",
			folder: "trip",
			name,
			manifestKey: `manifests/trip/${name}.json`,
		});

		const report = formatWriteReport([
			{ ...set("a"), outcome: "written" },
			{ ...set("b"), outcome: "written" },
			{ ...set("c"), outcome: "exists" },
			{ ...set("d"), outcome: "exists-other-set", detail: "existing manifest is a flat set" },
			{ ...set("e"), outcome: "unreadable-object", detail: '"trip/e/medium_e.webp": Access Denied' },
		]);

		expect(report).toBe(
			[
				"[written] nested trip/a -> manifests/trip/a.json",
				"[written] nested trip/b -> manifests/trip/b.json",
				"[exists] nested trip/c -> manifests/trip/c.json",
				"[exists-other-set] nested trip/d -> manifests/trip/d.json: existing manifest is a flat set",
				'[unreadable-object] nested trip/e -> manifests/trip/e.json: "trip/e/medium_e.webp": Access Denied',
				"",
				"Sets found: 5",
				"Written: 2",
				"Skipped: 2",
				"  exists: 1",
				"  exists-other-set: 1",
				"Failed: 1",
				"  collision: 0",
				"  unreadable-object: 1",
				"  failed: 0",
			].join("\n"),
		);
	});
});

describe("parseBackfillArgs", () => {
	it("reads a dry run of one folder, without the folder's trailing slash", () => {
		expect(parseBackfillArgs(["--bucket", "example-bucket", "--prefix", "japan-2025/"])).toEqual({
			bucket: "example-bucket",
			manifestBucket: undefined,
			pathPrefix: "",
			folder: "japan-2025",
			region: undefined,
			write: false,
			force: false,
		});
	});

	it("reads a forced write run for the second bucket", () => {
		expect(
			parseBackfillArgs([
				"--bucket",
				"example-legacy-bucket",
				"--manifest-bucket",
				"example-bucket",
				"--path-prefix",
				"legacy/",
				"--region",
				"ap-southeast-2",
				"--write",
				"--force",
			]),
		).toEqual({
			bucket: "example-legacy-bucket",
			manifestBucket: "example-bucket",
			pathPrefix: "legacy/",
			folder: undefined,
			region: "ap-southeast-2",
			write: true,
			force: true,
		});
	});

	it("accepts an explicitly empty path prefix for a write run", () => {
		const args = ["--bucket", "example-bucket", "--manifest-bucket", "example-bucket", "--write", "--path-prefix", ""];

		expect(parseBackfillArgs(args)).toMatchObject({ write: true, pathPrefix: "" });
	});

	it.each([
		[["--prefix", "japan-2025"], "--bucket is required"],
		[["--bucket", "example-bucket", "--prefix", "/"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", ""], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--prefix", "/japan-2025"], "--prefix must name a folder"],
		[["--bucket", "example-bucket", "--path-prefix", "legacy"], 'pathPrefix "legacy" must end with "/"'],
		[["--bucket", "example-bucket", "--write", "--path-prefix", ""], "--write needs --manifest-bucket"],
		[["--bucket", "example-bucket", "--write", "--manifest-bucket", "example-bucket"], "--write needs --path-prefix"],
		[["--bucket", "example-bucket", "--force"], "--force only applies with --write"],
		[["--bucket", "example-bucket", "--writ"], "Unknown option '--writ'"],
	])("rejects %j: %s", (argv, message) => {
		expect(() => parseBackfillArgs(argv)).toThrow(message);
	});
});
