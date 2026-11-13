import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hooksOf, readSettings, updateHooks, writeSettings } from "./settings-store";

const renames = vi.hoisted(() => [] as [string, string][]);

vi.mock("node:fs/promises", async (importActual) => {
	const actual = await importActual<typeof import("node:fs/promises")>();
	return {
		...actual,
		rename: (from: string, to: string) => {
			renames.push([from, to]);
			return actual.rename(from, to);
		},
	};
});

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(path.join(os.tmpdir(), "settings-"));
	process.env.SETTINGS_PATH = path.join(dir, "data", "settings.json");
	renames.length = 0;
});

afterEach(async () => {
	delete process.env.SETTINGS_PATH;
	await rm(dir, { recursive: true });
});

describe("settings store", () => {
	it("reads a missing file as empty settings", async () => {
		expect(await readSettings()).toEqual({ buckets: {} });
	});

	it("writes to a temp file and renames it into place, leaving no temp file behind", async () => {
		await writeSettings({ buckets: { b: { hooks: [{ id: "1", name: "Site", url: "https://example.com/x" }] } } });

		expect(renames).toEqual([[`${process.env.SETTINGS_PATH}.tmp`, process.env.SETTINGS_PATH]]);
		expect(await readdir(path.join(dir, "data"))).toEqual(["settings.json"]);
		expect(JSON.parse(await readFile(process.env.SETTINGS_PATH as string, "utf8")).buckets.b.hooks).toHaveLength(1);
	});

	it("updates one bucket's hooks and keeps the others", async () => {
		await writeSettings({ buckets: { other: { hooks: [] } } });

		await updateHooks("b", () => ({ hooks: [{ id: "1", name: "Site", url: "https://example.com/x" }], result: null }));

		const settings = await readSettings();
		expect(Object.keys(settings.buckets).sort()).toEqual(["b", "other"]);
	});

	it("does not swallow a corrupt file as empty settings, nor echo its content", async () => {
		await writeSettings({ buckets: {} });
		await writeFile(process.env.SETTINGS_PATH as string, "{not json https://example.com/secret");

		await expect(readSettings()).rejects.toThrow(new Error("Settings file is not valid JSON"));
	});

	it("keeps every change when edits overlap", async () => {
		const add = (id: string) =>
			updateHooks("b", (hooks) => ({
				hooks: [...hooks, { id, name: id, url: "https://example.com/x" }],
				result: null,
			}));

		await Promise.all(["1", "2", "3", "4", "5"].map(add));

		expect(hooksOf(await readSettings(), "b")).toHaveLength(5);
	});

	it("keeps accepting edits after one fails", async () => {
		await expect(
			updateHooks("b", () => {
				throw new Error("no");
			}),
		).rejects.toThrow("no");

		await expect(updateHooks("b", (hooks) => ({ hooks, result: "ok" }))).resolves.toBe("ok");
	});
});
