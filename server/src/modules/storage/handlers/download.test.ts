import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import storage from "../routes";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);
vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: async (_client: unknown, command: { input: { ResponseContentDisposition?: string } }) => {
		const query = new URLSearchParams({
			"response-content-disposition": command.input.ResponseContentDisposition ?? "",
		});
		return `https://cdn.example.test/signed?${query}`;
	},
}));

const app = new Hono().route("/storage", storage);
const SCOPE = "bucket=b&region=ap-southeast-2";

describe("GET /storage/download", () => {
	it("answers 400 without a key", async () => {
		expect((await app.request(`/storage/download?${SCOPE}`)).status).toBe(400);
	});

	it("answers 400 without a bucket", async () => {
		expect((await app.request("/storage/download?key=a.jpg")).status).toBe(400);
	});

	it("redirects to a URL that saves the file under its basename", async () => {
		const res = await app.request(`/storage/download?${SCOPE}&key=${encodeURIComponent('trip/é "a".jpg')}`);
		const location = new URL(res.headers.get("location") ?? "");

		expect(res.status).toBe(302);
		expect(location.searchParams.get("response-content-disposition")).toBe(
			`attachment; filename="_ _a_.jpg"; filename*=UTF-8''%C3%A9%20%22a%22.jpg`,
		);
	});

	it("names a set's original after the set", async () => {
		const res = await app.request(`/storage/download?${SCOPE}&key=trip/kyoto/original.jpg`);
		const disposition = new URL(res.headers.get("location") ?? "").searchParams.get("response-content-disposition");

		expect(disposition).toBe(`attachment; filename="kyoto.jpg"; filename*=UTF-8''kyoto.jpg`);
	});
});
