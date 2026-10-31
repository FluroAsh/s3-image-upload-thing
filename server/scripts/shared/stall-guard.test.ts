import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SET_CONCURRENCY } from "./map-limited";

const SERVER_ROOT = path.resolve(__dirname, "../..");

/** Runs `body` in a Bun process, which is the only runtime that exits when nothing is left to wait for. */
const inBun = (body: string) =>
	spawnSync(
		"bun",
		[
			"-e",
			`import { guardStall } from "./scripts/shared/stall-guard";
			import { mapLimited, SET_CONCURRENCY } from "./scripts/shared/map-limited";
			${body}`,
		],
		{ cwd: SERVER_ROOT, encoding: "utf8", timeout: 30_000 },
	);

describe("guardStall", () => {
	it("exits non-zero naming the sets left unfinished, and calls onStopped, when the run stops on work that never settles", () => {
		const run = inBun(`
			const sets = ["a", "b", "c"].map((name) => ({ layout: "nested", folder: "", name }));
			const main = async () => {
				await guardStall(
					(unfinished) => mapLimited(sets, 2, (set) => (set.name === "b" ? new Promise(() => {}) : Promise.resolve(set)), unfinished),
					() => console.log("stopped hook"),
				);
				console.log("totals");
			};
			main();`);

		expect(run.stdout).toContain("stopped hook");
		expect(run.stdout).not.toContain("totals");
		expect(run.stderr).toContain("The run stopped with 1 of 3 unfinished:");
		expect(run.stderr).toContain("nested b");
		expect(run.stderr).not.toMatch(/nested [ac]/);
		expect(run.status).toBe(1);
	});

	it("lists sets that never started when every worker is stalled", () => {
		const run = inBun(`
			const sets = Array.from({ length: SET_CONCURRENCY + 2 }, (_, n) => ({ layout: "nested", folder: "", name: "s" + n }));
			guardStall((unfinished) => mapLimited(sets, SET_CONCURRENCY, () => new Promise(() => {}), unfinished));`);

		expect(run.stderr).toContain(`${SET_CONCURRENCY + 2} of ${SET_CONCURRENCY + 2} unfinished`);
		expect(run.status).toBe(1);
	});

	it("leaves the exit code alone and removes its listener when the run completes or throws", async () => {
		const run = inBun(`
			await guardStall(async () => "done");
			await guardStall(async () => { throw new Error("boom"); }).catch(() => {});
			console.log("listeners", process.listenerCount("beforeExit"));`);

		expect(run.stdout).toContain("listeners 0");
		expect(run.stderr).toBe("");
		expect(run.status).toBe(0);
	});
});
