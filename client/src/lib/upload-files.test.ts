import { describe, expect, it } from "vitest";

import { type PickedFile, setNameOf, uploadWarnings } from "./upload-files";

const picked = (name: string, width?: number, height?: number): PickedFile => ({
	id: name,
	file: new File([], name),
	width,
	height,
});

describe("setNameOf", () => {
	it("drops only the last extension", () => {
		expect(setNameOf("harbour.dawn.jpg")).toBe("harbour.dawn");
	});
});

describe("uploadWarnings", () => {
	it("warns about a source under 800px by its longest edge and lists the skipped sizes", () => {
		expect(uploadWarnings(picked("a.png", 640, 480), new Set())).toEqual(["source 640px · medium, large skipped"]);
	});

	it("stays quiet for a large source or one of unknown size", () => {
		expect(uploadWarnings(picked("a.jpg", 4000, 600), new Set())).toEqual([]);
		expect(uploadWarnings(picked("a.heic"), new Set())).toEqual([]);
	});

	it("warns when the set name is already in the folder", () => {
		expect(uploadWarnings(picked("dawn.jpg", 4000, 3000), new Set(["dawn"]))).toEqual(["a set named dawn exists here"]);
	});
});
