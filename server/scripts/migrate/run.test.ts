import { describe, expect, it } from "vitest";

import { setKeyPrefix } from "@/modules/storage/services/manifest";
import type { UploadOutcome } from "@/modules/storage/services/upload-pipeline";
import type { FileVariant } from "~/shared/types";

import {
	buildMapping,
	countFailedMigrations,
	formatMigrateResult,
	formatMigrateTotals,
	type MigrateIo,
	type MigrateResult,
	migrateFlatSets,
} from "./run";

const CAT = ["cat_ab12.webp", "small_cat_ab12.webp"];
const DOG = ["blog/dog_cd34.webp", "blog/large_dog_cd34.webp"];
const DOG_MIGRATED = ["blog/dog_cd34/medium_dog_cd34.webp", "blog/dog_cd34/full_dog_cd34.webp"];

const stored = (key: string, variant: FileVariant["variant"]) => ({ key, variant }) as FileVariant;

/** A bucket holding `keys`, whose pipeline answers each upload with `respond`. */
const bucket = (
	keys: string[],
	respond: (file: File, destination: string) => UploadOutcome = () => ({ files: [] }),
) => {
	const read: string[] = [];
	const uploads: { name: string; type: string; destination: string; text: string }[] = [];

	const io: MigrateIo = {
		setExists: async (identity) => keys.some((key) => key.startsWith(setKeyPrefix(identity))),
		readObject: async (key) => {
			read.push(key);
			return Buffer.from(`bytes of ${key}`);
		},
		upload: async (file, destination) => {
			uploads.push({ name: file.name, type: file.type, destination, text: await file.text() });
			return respond(file, destination);
		},
	};

	return { keys, io, read, uploads };
};

const summary = (results: Awaited<ReturnType<typeof migrateFlatSets>>) =>
	results.map(({ name, outcome, linkTo }) => ({ name, outcome, linkTo }));

describe("migrateFlatSets", () => {
	it("in a dry run says which sets it would migrate and which already are, reading and storing nothing", async () => {
		const { keys, io, read, uploads } = bucket([...CAT, ...DOG, ...DOG_MIGRATED]);

		const results = await migrateFlatSets(keys, io, { write: false });

		expect(summary(results)).toEqual([
			{ name: "cat_ab12", outcome: "to-migrate", linkTo: null },
			{ name: "dog_cd34", outcome: "already-migrated", linkTo: "blog/dog_cd34/medium_dog_cd34.webp" },
		]);
		expect(read).toEqual([]);
		expect(uploads).toEqual([]);
	});

	it("with write, hands each original to the pipeline under its own file name, destined for the flat set's own folder", async () => {
		const { keys, io, read, uploads } = bucket([...CAT, ...DOG], (file, destination) => {
			const prefix = `${destination ? `${destination}/` : ""}${file.name.replace(".webp", "")}/`;
			return { files: [stored(`${prefix}placeholder.webp`, "placeholder"), stored(`${prefix}large.webp`, "large")] };
		});

		const results = await migrateFlatSets(keys, io, { write: true });

		expect(read.sort()).toEqual(["blog/dog_cd34.webp", "cat_ab12.webp"]);
		expect(uploads.sort((a, b) => a.name.localeCompare(b.name))).toEqual([
			{ name: "cat_ab12.webp", type: "image/webp", destination: "", text: "bytes of cat_ab12.webp" },
			{ name: "dog_cd34.webp", type: "image/webp", destination: "blog", text: "bytes of blog/dog_cd34.webp" },
		]);
		expect(summary(results)).toEqual([
			{ name: "cat_ab12", outcome: "migrated", linkTo: "cat_ab12/large.webp" },
			{ name: "dog_cd34", outcome: "migrated", linkTo: "blog/dog_cd34/large.webp" },
		]);
	});

	it("with write, migrates a non-webp original under its real key, name and type, and maps the key with its extension", async () => {
		const original = "images/spiderman_x.jpg";
		const { keys, io, read, uploads } = bucket([original, "images/small_spiderman_x.jpg"], () => ({
			files: [stored("images/spiderman_x/small_spiderman_x.webp", "small")],
		}));

		const results = await migrateFlatSets(keys, io, { write: true });

		expect(read).toEqual([original]);
		expect(uploads).toEqual([
			{ name: "spiderman_x.jpg", type: "image/jpeg", destination: "images", text: `bytes of ${original}` },
		]);
		expect(buildMapping(results)).toEqual([
			{
				original,
				setPrefix: "images/spiderman_x/",
				linkTo: "images/spiderman_x/small_spiderman_x.webp",
				outcome: "migrated",
			},
		]);
	});

	it("with write, fails the second original of a shared set folder without reading or storing it", async () => {
		const { keys, io, read } = bucket(["x.webp", "small_x.webp", "x.jpg"], () => ({ files: [] }));

		const results = await migrateFlatSets(keys, io, { write: true });

		expect(read).toEqual(["x.webp"]);
		expect(results.map(({ original, outcome }) => ({ original, outcome }))).toEqual([
			{ original: "x.webp", outcome: "migrated" },
			{ original: "x.jpg", outcome: "unsafe-target" },
		]);
		expect(results[1].detail).toContain('"x.jpg" and "x.webp"');
		expect(countFailedMigrations(results)).toBe(1);
	});

	it.each([
		["exists", "already-migrated", "the upload pipeline found its folder taken"],
		["reserved", "reserved", "the upload pipeline refused its folder as reserved"],
	] as const)("with write, reports a pipeline refusal of %s as %s", async (refused, outcome, detail) => {
		const { keys, io } = bucket(CAT, () => ({ refused, names: ["cat_ab12"] }));

		expect(await migrateFlatSets(keys, io, { write: true })).toMatchObject([{ outcome, detail, linkTo: null }]);
	});

	it("with write, reports a set that fails with its reason and carries on with the rest", async () => {
		const { keys, io } = bucket([...CAT, ...DOG], (file) => {
			if (file.name === "cat_ab12.webp") throw new Error("Input buffer contains unsupported image format");
			return { files: [stored("blog/dog_cd34/large_dog_cd34.webp", "large")] };
		});

		expect(await migrateFlatSets(keys, io, { write: true })).toMatchObject([
			{ name: "cat_ab12", outcome: "failed", detail: "Input buffer contains unsupported image format", linkTo: null },
			{ name: "dog_cd34", outcome: "migrated" },
		]);
	});

	it("carries a refusal made from the listing as the set's outcome, without asking the bucket about it", async () => {
		const { keys, io, read, uploads } = bucket(["legacy/cat_ab12.webp", "legacy/small_cat_ab12.webp"]);
		io.setExists = async () => {
			throw new Error("asked the bucket");
		};

		expect(await migrateFlatSets(keys, io, { write: true })).toMatchObject([
			{ outcome: "reserved", detail: 'uploads are refused under "legacy/cat_ab12/"', linkTo: null },
		]);
		expect([read, uploads]).toEqual([[], []]);
	});

	it("with a limit, migrates at most that many sets and leaves the rest to migrate", async () => {
		const { keys, io, uploads } = bucket([...CAT, ...DOG], () => ({ files: [] }));

		const results = await migrateFlatSets(keys, io, { write: true, limit: 1 });

		expect(uploads).toHaveLength(1);
		expect(results.map(({ outcome }) => outcome).sort()).toEqual(["migrated", "to-migrate"]);
	});

	it("tells the caller about each set as it finishes", async () => {
		const { keys, io } = bucket([...CAT, ...DOG]);
		const heard: string[] = [];

		await migrateFlatSets(keys, io, { write: false }, ({ name }) => heard.push(name));

		expect(heard.sort()).toEqual(["cat_ab12", "dog_cd34"]);
	});
});

const result = (overrides: Partial<MigrateResult>): MigrateResult => ({
	layout: "flat",
	folder: "",
	name: "cat_ab12",
	original: "cat_ab12.webp",
	setPrefix: "cat_ab12/",
	outcome: "migrated",
	linkTo: "cat_ab12/large_cat_ab12.webp",
	...overrides,
});

describe("buildMapping", () => {
	it("has one entry per flat set with an original, sorted by that key, linking only the sets that have a new folder", () => {
		const mapping = buildMapping([
			result({ name: "dog", original: "dog.webp", setPrefix: "dog/", outcome: "failed", linkTo: null, detail: "x" }),
			result({ original: null, outcome: "no-original", linkTo: null }),
			result({}),
			result({
				name: "ant",
				original: "ant.webp",
				setPrefix: "ant/",
				outcome: "to-migrate",
				linkTo: null,
			}),
		]);

		expect(mapping).toEqual([
			{ original: "ant.webp", setPrefix: "ant/", linkTo: null, outcome: "to-migrate" },
			{
				original: "cat_ab12.webp",
				setPrefix: "cat_ab12/",
				linkTo: "cat_ab12/large_cat_ab12.webp",
				outcome: "migrated",
			},
			{ original: "dog.webp", setPrefix: "dog/", linkTo: null, outcome: "failed" },
		]);
	});
});

describe("formatMigrateResult", () => {
	it("prints the outcome, the set, where it goes and why", () => {
		expect(formatMigrateResult(result({ folder: "blog", setPrefix: "blog/cat_ab12/" }))).toBe(
			"[migrated] flat blog/cat_ab12 -> blog/cat_ab12/ (link to cat_ab12/large_cat_ab12.webp)",
		);
		expect(formatMigrateResult(result({ outcome: "failed", linkTo: null, detail: "timed out" }))).toBe(
			"[failed] flat cat_ab12 -> cat_ab12/: timed out",
		);
	});
});

describe("formatMigrateTotals", () => {
	it("counts every outcome under migrated, left to migrate, skipped and failed", () => {
		const results = [
			result({}),
			result({ outcome: "to-migrate" }),
			result({ outcome: "already-migrated" }),
			result({ outcome: "already-migrated" }),
			result({ outcome: "unsafe-target", linkTo: null }),
		];

		expect(countFailedMigrations(results)).toBe(1);
		expect(formatMigrateTotals(results)).toBe(
			[
				"Flat sets found: 5",
				"Migrated: 1",
				"Left to migrate: 1",
				"Skipped: 2",
				"  already-migrated: 2",
				"  no-original: 0",
				"  reserved: 0",
				"Failed: 1",
				"  unsafe-target: 1",
				"  failed: 0",
			].join("\n"),
		);
	});
});
