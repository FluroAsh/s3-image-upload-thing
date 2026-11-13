import { describe, expect, it } from "vitest";

import { limitConcurrency } from "./concurrency";

describe("limitConcurrency", () => {
	it("never runs more than the limit at once and still finishes every task", async () => {
		const run = limitConcurrency(2);
		let active = 0;
		let peak = 0;

		const results = await Promise.all(
			[1, 2, 3, 4, 5].map((n) =>
				run(async () => {
					active++;
					peak = Math.max(peak, active);
					await new Promise((resolve) => setTimeout(resolve, 5));
					active--;
					return n;
				}),
			),
		);

		expect(results).toEqual([1, 2, 3, 4, 5]);
		expect(peak).toBe(2);
	});

	it("keeps going after a task throws", async () => {
		const run = limitConcurrency(1);
		const failing = run(() => Promise.reject(new Error("x")));
		const next = run(async () => "ok");

		await expect(failing).rejects.toThrow("x");
		await expect(next).resolves.toBe("ok");
	});
});
