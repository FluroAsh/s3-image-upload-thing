import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { mapLimited } from "./map-limited";

describe("mapLimited", () => {
	it("keeps the order of the items whatever order they finish in", async () => {
		const results = await mapLimited(
			[30, 10, 20],
			2,
			async (delay) => {
				await new Promise((resolve) => setTimeout(resolve, delay));
				return delay * 2;
			},
			String,
		);

		expect(results).toEqual([60, 20, 40]);
	});

	// Bun, which runs the scripts, exits 0 the moment its event loop is empty, so only a Bun process shows it.
	it("exits non-zero naming the items left unfinished when the run stops on work that never settles", () => {
		const run = spawnSync(
			"bun",
			[
				"-e",
				`import { mapLimited } from "./scripts/shared/map-limited";
				const main = async () => {
					await mapLimited(["a", "b", "c"], 2, (item) => (item === "b" ? new Promise(() => {}) : Promise.resolve(item)), (item) => "set " + item);
					console.log("totals");
				};
				main();`,
			],
			{ cwd: path.resolve(__dirname, "../.."), encoding: "utf8" },
		);

		expect(run.stdout).not.toContain("totals");
		expect(run.stderr).toContain("1 of 3 unfinished");
		expect(run.stderr).toContain("set b");
		expect(run.stderr).not.toMatch(/set [ac]/);
		expect(run.status).toBe(1);
	});
});
