import { FetchError } from "ofetch";
import { describe, expect, it, vi } from "vitest";

import { MAX_UPLOAD_REQUEST_BYTES } from "~/shared/constants/upload";
import type { UploadFileResult } from "~/shared/types";

import { UPLOAD_CONCURRENCY, uploadEach } from "./upload-each";

const fileNamed = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const stored = (file: File): UploadFileResult[] => [{ file: file.name, status: "stored" }];

describe("uploadEach", () => {
	it("keeps the rest of the batch when one request fails", async () => {
		const tooLarge = Object.assign(new FetchError("413"), { data: { error: "Request body too large" } });
		const post = vi.fn(async (file: File) => {
			if (file.name === "b.jpg") throw tooLarge;
			return stored(file);
		});

		const results = await uploadEach([fileNamed("a.jpg"), fileNamed("b.jpg"), fileNamed("c.jpg")], post, () => {});

		expect(results).toEqual([
			{ file: "a.jpg", status: "stored" },
			{ file: "b.jpg", status: "failed", reason: "Request body too large" },
			{ file: "c.jpg", status: "stored" },
		]);
	});

	it(`runs at most ${UPLOAD_CONCURRENCY} requests at once and counts every file`, async () => {
		let active = 0;
		let peak = 0;
		const post = async (file: File) => {
			peak = Math.max(peak, ++active);
			await new Promise((resolve) => setTimeout(resolve, 1));
			active--;
			return stored(file);
		};
		const onSettled = vi.fn();

		await uploadEach(
			Array.from({ length: 8 }, (_, i) => fileNamed(`${i}.jpg`)),
			post,
			onSettled,
		);

		expect(peak).toBe(UPLOAD_CONCURRENCY);
		expect(onSettled).toHaveBeenCalledTimes(8);
	});

	it("refuses a file over the upload limit without sending it", async () => {
		const post = vi.fn(async (file: File) => stored(file));
		const huge = fileNamed("huge.tif");
		Object.defineProperty(huge, "size", { value: MAX_UPLOAD_REQUEST_BYTES + 1 });

		const [result] = await uploadEach([huge], post, () => {});

		expect(post).not.toHaveBeenCalled();
		expect(result).toMatchObject({ file: "huge.tif", status: "refused" });
	});

	it("refuses a second file with the same name without sending it", async () => {
		const post = vi.fn(async (file: File) => stored(file));

		const results = await uploadEach([fileNamed("a.jpg"), fileNamed("a.jpg")], post, () => {});

		expect(post).toHaveBeenCalledTimes(1);
		expect(results[1]).toEqual({ file: "a.jpg", status: "refused", reason: "duplicate name in this upload" });
	});
});
