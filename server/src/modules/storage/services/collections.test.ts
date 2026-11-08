import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Collection, CollectionsFile } from "~/shared/types";

import { s3 } from "../fake-s3";
import {
	COLLECTIONS_KEY,
	CollectionsConflictError,
	CollectionsValidationError,
	readCollections,
	updateCollections,
} from "./collections";

vi.mock("@aws-sdk/client-s3", async () => (await import("../fake-s3")).s3.sdk);

const LOCATION = { bucketName: "example-bucket", bucketRegion: "us-east-1" };

const collection = (slug: string, sets: string[], extra: Partial<Collection> = {}): Collection => ({
	slug,
	name: slug,
	photos: sets.map((set) => ({ set, alt: null, caption: null, tags: [] })),
	...extra,
});

const stored = (file: Partial<CollectionsFile>) => ({
	ETag: '"v1"',
	Body: {
		transformToString: async () => "",
		transformToByteArray: async () =>
			new Uint8Array(Buffer.from(JSON.stringify({ schema: 1, updatedAt: "x", collections: [], ...file }))),
	},
});

const lost = () => Object.assign(new Error("412"), { name: "PreconditionFailed" });

const answer = (current: ReturnType<typeof stored> | null, onPut?: () => void) => {
	s3.respond = async ({ command }) => {
		if (command === "GetObject") {
			if (!current) throw Object.assign(new Error("none"), { name: "NoSuchKey" });
			return current;
		}
		if (command === "PutObject") onPut?.();
		return { ETag: '"v2"' };
	};
};

const commands = () => s3.sent.map(({ command }) => command);
const add = (c: Collection) => (file: CollectionsFile) => ({ ...file, collections: [...file.collections, c] });

beforeEach(() => {
	s3.sent.length = 0;
	s3.respond = s3.defaultRespond;
});

describe("readCollections", () => {
	it("treats a missing object as an empty document", async () => {
		answer(null);
		expect(await readCollections(LOCATION)).toMatchObject({ file: { schema: 1, collections: [] }, etag: null });
	});
});

describe("updateCollections", () => {
	it("creates the file with IfNoneMatch and no history copy when none exists", async () => {
		answer(null);
		const { after: written } = await updateCollections(add(collection("japan", ["a/b"])), LOCATION);

		expect(commands()).toEqual(["GetObject", "PutObject"]);
		expect(s3.sent[1].input).toMatchObject({
			Key: COLLECTIONS_KEY,
			IfNoneMatch: "*",
			ContentType: "application/json",
			CacheControl: "no-cache",
		});
		expect(written.collections[0].slug).toBe("japan");
	});

	it("copies the current file to history before writing with IfMatch", async () => {
		answer(stored({}));
		await updateCollections(add(collection("japan", ["a/b"])), LOCATION);

		expect(commands()).toEqual(["GetObject", "CopyObject", "PutObject"]);
		expect(s3.sent[1].input).toMatchObject({ CopySourceIfMatch: '"v1"', IfNoneMatch: "*" });
		expect(String(s3.sent[1].input.Key)).toMatch(/^gallery\/history\/collections-.+\.json$/);
		expect(s3.sent[2].input).toMatchObject({ IfMatch: '"v1"' });
	});

	it("re-reads and re-applies after a 412, then succeeds", async () => {
		let puts = 0;
		answer(stored({}), () => {
			if (++puts === 1) throw lost();
		});
		const change = vi.fn(add(collection("japan", ["a/b"])));
		await updateCollections(change, LOCATION);

		expect(change).toHaveBeenCalledTimes(2);
		expect(commands().filter((command) => command === "CopyObject")).toHaveLength(2);
	});

	it("gives up after 3 attempts", async () => {
		answer(stored({}), () => {
			throw lost();
		});
		await expect(updateCollections(add(collection("japan", ["a/b"])), LOCATION)).rejects.toThrow(
			CollectionsConflictError,
		);
		expect(commands().filter((command) => command === "PutObject")).toHaveLength(3);
	});

	it.each([
		["bad slug", [collection("Bad_Slug", [])]],
		["duplicate slug", [collection("a", []), collection("a", [])]],
		["set in two collections", [collection("a", ["x/y"]), collection("b", ["x/y"])]],
		["collection with no photos", [collection("a", [])]],
		["set twice in one collection", [collection("a", ["x/y", "x/y"])]],
		["dot segment", [collection("a", ["x/./y"])]],
		["dot-dot segment", [collection("a", ["x/../y"])]],
		["leading slash", [collection("a", ["/x/y"])]],
		["cover outside collection", [collection("a", ["x/y"], { cover: "x/z" })]],
		["oversized body", [collection("a", ["x/y"], { name: "n".repeat(1_000_000) })]],
	])("rejects %s without writing", async (_name, collections) => {
		answer(null);
		await expect(updateCollections((file) => ({ ...file, collections }), LOCATION)).rejects.toThrow(
			CollectionsValidationError,
		);
		expect(commands()).not.toContain("PutObject");
	});

	it("accepts a cover inside its collection", async () => {
		answer(null);
		await updateCollections(add(collection("a", ["x/y"], { cover: "x/y" })), LOCATION);
		expect(commands()).toContain("PutObject");
	});
});
