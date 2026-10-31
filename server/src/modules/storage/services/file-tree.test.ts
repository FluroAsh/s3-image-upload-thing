import { describe, expect, it } from "vitest";

import { constructFileTree } from "./file-tree";

const tree = (keys: string[]) => constructFileTree({ objects: keys.map((Key) => ({ Key, Size: 10 })) });

describe("constructFileTree", () => {
	it("leaves a set's manifest out of the set folder's children and its child count", () => {
		const nodes = tree(["trip/photo/large_photo.webp", "trip/photo/medium_photo.webp", "trip/photo/manifest.json"]);

		expect(nodes.filter(({ parentId }) => parentId === "trip/photo/").map(({ name }) => name)).toEqual([
			"large_photo.webp",
			"medium_photo.webp",
		]);
		expect(nodes.find(({ id }) => id === "trip/photo/")).toMatchObject({ isFolder: true, childCount: 2 });
	});

	it("leaves a set's original out of the set folder's children, as it is private", () => {
		const nodes = tree(["trip/photo/large_photo.webp", "trip/photo/original.jpg"]);

		expect(nodes.filter(({ parentId }) => parentId === "trip/photo/").map(({ name }) => name)).toEqual([
			"large_photo.webp",
		]);
		expect(nodes.find(({ id }) => id === "trip/photo/")).toMatchObject({ childCount: 1 });
	});

	it("keeps a manifest.json that only sits beside a loose image whose name is not the folder's", () => {
		const keys = ["trip/beach.webp", "trip/manifest.json"];

		expect(
			tree(keys)
				.filter(({ isFolder }) => !isFolder)
				.map(({ id }) => id)
				.sort(),
		).toEqual(keys);
	});

	it("keeps every other .json file, including a manifest.json in a folder that holds no image set", () => {
		const keys = [
			"manifest.json",
			"data/manifest.json",
			"data/original.jpg",
			"data/notes.txt",
			"trip/photo/large_photo.webp",
			"trip/photo/exif.json",
		];

		expect(
			tree(keys)
				.filter(({ isFolder }) => !isFolder)
				.map(({ id }) => id)
				.sort(),
		).toEqual([...keys].sort());
	});
});
