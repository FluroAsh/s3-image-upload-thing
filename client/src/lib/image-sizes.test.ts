import { describe, expect, it } from "vitest";

import { sizeStatuses } from "~/shared/image-sizes";
import type { Manifest, ManifestVariant } from "~/shared/types";

const file = (edge: number, etag = `etag-${edge}`): ManifestVariant => ({
	key: `k-${edge}`,
	format: "webp",
	width: edge,
	height: Math.round(edge / 2),
	bytes: edge,
	etag,
});

const manifest = (variants: Manifest["variants"], sourceEdge?: number): Manifest => ({
	schema: 1,
	name: "n",
	folder: "",
	status: "ready",
	createdAt: "2026-01-01T00:00:00.000Z",
	placeholder: null,
	source: sourceEdge
		? { key: "o", public: false, sha256: "x", bytes: 1, width: sourceEdge, height: sourceEdge / 2 }
		: null,
	variants,
});

const states = (m: Manifest) => Object.fromEntries(sizeStatuses(m).map(({ name, state }) => [name, state]));

describe("sizeStatuses", () => {
	it.each([true, false])("marks stored sizes present, skipped ones not applicable (source kept: %s)", (kept) => {
		const result = states(
			manifest(
				{ placeholder: file(20), thumbnail: file(120), small: file(400), full: file(500) },
				kept ? 500 : undefined,
			),
		);
		expect(result).toEqual({
			placeholder: "present",
			thumbnail: "present",
			small: "present",
			medium: "notApplicable",
			large: "notApplicable",
			full: "present",
		});
	});

	it.each([true, false])("marks an expected size with no file missing (source kept: %s)", (kept) => {
		const result = states(manifest({ placeholder: file(20), full: file(3840) }, kept ? 5000 : undefined));
		expect(result).toMatchObject({ thumbnail: "missing", small: "missing", large: "missing", full: "present" });
	});

	it.each([true, false])("expects every size when nothing says how big the source was (source kept: %s)", (kept) => {
		const result = states(manifest({}, kept ? 5000 : undefined));
		expect(Object.values(result).every((state) => state === "missing")).toBe(true);
	});

	it.each([true, false])("marks a file sharing an ETag with a smaller size mismatched (source kept: %s)", (kept) => {
		const result = states(
			manifest({ small: file(400, "same"), medium: file(400, "same"), full: file(3840) }, kept ? 3840 : undefined),
		);
		expect(result).toMatchObject({ small: "present", medium: "mismatched" });
	});

	it.each([
		true,
		false,
	])("marks a file narrower than its size while a wider one exists mismatched (source kept: %s)", (kept) => {
		const result = states(
			manifest({ small: file(400), medium: file(400, "other"), full: file(3840) }, kept ? 3840 : undefined),
		);
		expect(result).toMatchObject({ small: "present", medium: "mismatched", full: "present" });
	});

	it("does not flag the widest file for being under its bound", () => {
		expect(states(manifest({ full: file(900) }, 900)).full).toBe("present");
	});
});
