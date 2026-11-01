import { afterEach, describe, expect, it, vi } from "vitest";

import { s3 } from "@/modules/storage/fake-s3";
import { REQUEST_TIMEOUT_MS } from "@/modules/storage/services/s3-operations";

import { listObjects } from "./list-objects";

vi.mock("@aws-sdk/client-s3", async () => (await import("@/modules/storage/fake-s3")).s3.sdk);

const location = { bucketName: "example-bucket", bucketRegion: "us-east-1" };

afterEach(() => vi.useRealTimers());

describe("listObjects", () => {
	it("lists every page under the folder, however long the pages take in total, since a run must see every key", async () => {
		vi.useFakeTimers();
		s3.sent.length = 0;
		s3.respond = ({ input }) =>
			new Promise((resolve) => {
				const page = Number(input.ContinuationToken ?? 0) + 1;
				const Key = `trip/photo-${page}.webp`;
				const more = page < 3;
				const answer = {
					Contents: [{ Key, ETag: `"${page}"`, Size: page }],
					IsTruncated: more,
					NextContinuationToken: more ? String(page) : undefined,
				};
				setTimeout(() => resolve(answer), REQUEST_TIMEOUT_MS * 0.6);
			});

		const listing = listObjects(location, "trip");
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);

		expect(await listing).toEqual([
			{ key: "trip/photo-1.webp", etag: '"1"', bytes: 1 },
			{ key: "trip/photo-2.webp", etag: '"2"', bytes: 2 },
			{ key: "trip/photo-3.webp", etag: '"3"', bytes: 3 },
		]);
		expect(s3.sent.map(({ input }) => input.Prefix)).toEqual(["trip/", "trip/", "trip/"]);
	});

	it("fails an empty listing, which is far more often a wrong bucket, folder or region", async () => {
		s3.respond = async () => ({});

		await expect(listObjects(location, "trip")).rejects.toThrow("No keys found in example-bucket (folder trip)");
	});
});
