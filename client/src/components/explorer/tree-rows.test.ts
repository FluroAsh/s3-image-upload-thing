import { describe, expect, it } from "vitest";

import type { TreeNode } from "~/shared/types";

import { buildRows, navigate } from "./tree-rows";

const folder = (id: string): TreeNode => {
	const parts = id.split("/").filter(Boolean);
	return {
		id,
		parentId: parts.length > 1 ? `${parts.slice(0, -1).join("/")}/` : "",
		name: parts.at(-1) ?? id,
		depth: parts.length - 1,
		isFolder: true,
		childCount: 0,
	};
};

const file = (id: string): TreeNode => {
	const parts = id.split("/");
	return {
		id,
		parentId: parts.length > 1 ? `${parts.slice(0, -1).join("/")}/` : "",
		name: parts.at(-1) ?? id,
		depth: parts.length - 1,
		isFolder: false,
		childCount: 0,
	};
};

const mapOf = (nodes: TreeNode[]) => {
	const map = new Map<string, TreeNode[]>();
	for (const node of nodes) map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]);
	return map;
};

const nodes = [
	folder("2026/"),
	folder("2026/sydney/"),
	folder("2026/sydney/manly-ferry/"),
	file("2026/sydney/manly-ferry/full_manly-ferry.webp"),
	file("2026/sydney/ferry-timelapse.mp4"),
	file("2026/sydney/notes.txt"),
	file("2026/sydney/sydney-notes.txt"),
	folder("2025/"),
	file("2025/devonport-ferry.txt"),
];
const childMap = mapOf(nodes);
const ids = (rows: { node: TreeNode }[]) => rows.map((row) => row.node.id);

describe("buildRows", () => {
	it("lists only the root rows while everything is collapsed", () => {
		expect(ids(buildRows(childMap, {}, "").rows)).toEqual(["2026/", "2025/"]);
	});

	it("lists the children of expanded folders and shows a set as one row", () => {
		const { rows } = buildRows(childMap, { "2026/": true, "2026/sydney/": true }, "");
		expect(ids(rows)).toContain("2026/sydney/manly-ferry/");
		expect(ids(rows)).not.toContain("2026/sydney/manly-ferry/full_manly-ferry.webp");
		expect(rows.find((row) => row.node.id === "2026/sydney/manly-ferry/")).toMatchObject({ kind: "set", count: 1 });
	});

	it("keeps ancestors of matches, opens them and counts only the matches", () => {
		const { rows, matches } = buildRows(childMap, {}, "FERRY");
		expect(matches).toBe(3);
		expect(ids(rows)).toEqual(
			expect.arrayContaining([
				"2026/",
				"2026/sydney/",
				"2026/sydney/manly-ferry/",
				"2026/sydney/ferry-timelapse.mp4",
				"2025/",
			]),
		);
		expect(ids(rows)).not.toContain("2026/sydney/notes.txt");
		expect(rows.find((row) => row.node.id === "2026/sydney/")).toMatchObject({ expanded: true, count: 2 });
	});

	it("lists a matching folder's contents, collapsed until expanded", () => {
		expect(ids(buildRows(childMap, {}, "2025").rows)).toEqual(["2025/"]);
		expect(ids(buildRows(childMap, { "2025/": true }, "2025").rows)).toEqual(["2025/", "2025/devonport-ferry.txt"]);
	});

	it("opens a matching folder holding a deeper match and lists all its contents", () => {
		const { rows, matches } = buildRows(childMap, {}, "sydney");
		expect(matches).toBe(2);
		expect(ids(rows)).toEqual([
			"2026/",
			"2026/sydney/",
			"2026/sydney/manly-ferry/",
			"2026/sydney/ferry-timelapse.mp4",
			"2026/sydney/notes.txt",
			"2026/sydney/sydney-notes.txt",
		]);
		expect(rows.find((row) => row.node.id === "2026/sydney/")).toMatchObject({ locked: true, expanded: true });
	});

	it("returns nothing when no name matches", () => {
		expect(buildRows(childMap, {}, "xyz")).toEqual({ rows: [], matches: 0 });
	});
});

describe("navigate", () => {
	const { rows } = buildRows(childMap, { "2026/": true }, "");
	const [first, second] = ids(rows);

	it("moves between rows and stops at the ends", () => {
		expect(navigate(rows, first, "ArrowDown")).toEqual({ type: "focus", id: second });
		expect(navigate(rows, first, "ArrowUp")).toBeUndefined();
		expect(navigate(rows, second, "Home")).toEqual({ type: "focus", id: first });
	});

	it("expands a collapsed folder, then steps into it", () => {
		expect(navigate(rows, "2025/", "ArrowRight")).toEqual({ type: "toggle", id: "2025/" });
		expect(navigate(rows, "2026/", "ArrowRight")).toEqual({ type: "focus", id: "2026/sydney/" });
	});

	it("collapses an open folder, otherwise goes to the parent", () => {
		expect(navigate(rows, "2026/", "ArrowLeft")).toEqual({ type: "toggle", id: "2026/" });
		expect(navigate(rows, "2026/sydney/", "ArrowLeft")).toEqual({ type: "focus", id: "2026/" });
		expect(navigate(rows, "2025/", "ArrowLeft")).toBeUndefined();
	});

	it("moves to the parent instead of collapsing a folder the filter holds open", () => {
		const filtered = buildRows(childMap, {}, "ferry").rows;
		expect(navigate(filtered, "2026/sydney/", "ArrowLeft")).toEqual({ type: "focus", id: "2026/" });
		expect(navigate(filtered, "2026/", "ArrowLeft")).toBeUndefined();
	});
});
