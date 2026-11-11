import type { TreeNode } from "~/shared/types";

import { isSetFolder } from "./utils";

export const ROW_KINDS = ["folder", "set", "file"] as const;

export type TreeRowData = {
	/** The tree entry this row shows. */
	node: TreeNode;
	/** A set is a folder of one image's sizes, shown as a single row. */
	kind: (typeof ROW_KINDS)[number];
	/** A set's size files; empty for folders and files. */
	variants: TreeNode[];
	/** Whether a folder's children are listed below it. */
	expanded: boolean;
	/** Held open by the filter because a match sits below it, so it can't collapse. */
	locked: boolean;
	/** Children for a folder (matches below it while filtering) or sizes for a set. */
	count: number;
};

type Visit = { rows: TreeRowData[]; hits: number };

const NONE: Visit = { rows: [], hits: 0 };

/** Flattens the loaded tree into the visible rows; a filter keeps matches and opens their ancestors, and a matching folder lists all its contents. */
export const buildRows = (childMap: Map<string, TreeNode[]>, expanded: Record<string, boolean>, query: string) => {
	const needle = query.trim().toLowerCase();
	const filtering = needle !== "";

	const visit = (node: TreeNode, inMatch: boolean): Visit => {
		const hit = filtering && node.name.toLowerCase().includes(needle) ? 1 : 0;
		const children = childMap.get(node.id) ?? [];
		const filtered = filtering && !inMatch;

		if (!node.isFolder || isSetFolder(node, children)) {
			if (filtered && !hit) return NONE;
			const isSet = node.isFolder;
			const row: TreeRowData = {
				node,
				kind: isSet ? "set" : "file",
				variants: isSet ? children : [],
				expanded: false,
				locked: false,
				count: children.length,
			};
			return { rows: [row], hits: hit };
		}

		const locked = filtered && !hit;
		const open = locked || !!expanded[node.id];
		const below = open ? children.map((child) => visit(child, !filtered || !!hit)) : [];
		const hitsBelow = below.reduce((sum, child) => sum + child.hits, 0);
		if (locked && !hitsBelow) return NONE;

		const row: TreeRowData = {
			node,
			kind: "folder",
			variants: [],
			expanded: open,
			locked,
			count: locked ? hitsBelow : node.childCount,
		};
		return { rows: [row, ...below.flatMap((child) => child.rows)], hits: hit + hitsBelow };
	};

	const roots = (childMap.get("") ?? []).map((root) => visit(root, false));
	return { rows: roots.flatMap((root) => root.rows), matches: roots.reduce((sum, root) => sum + root.hits, 0) };
};

export const TREE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"] as const;

export type TreeKey = (typeof TREE_KEYS)[number];

export const isTreeKey = (key: string): key is TreeKey => (TREE_KEYS as readonly string[]).includes(key);

export type TreeMove = { type: "focus"; id: string } | { type: "toggle"; id: string };

/** What a navigation key does from the focused row; `undefined` when it has no effect there. */
export const navigate = (rows: TreeRowData[], id: string, key: TreeKey): TreeMove | undefined => {
	const index = rows.findIndex((row) => row.node.id === id);
	const row = rows[index];
	if (!row) return;

	const focus = (target: TreeRowData | undefined): TreeMove | undefined =>
		target && { type: "focus", id: target.node.id };

	switch (key) {
		case "ArrowDown":
			return focus(rows[index + 1]);
		case "ArrowUp":
			return focus(rows[index - 1]);
		case "Home":
			return focus(rows[0]);
		case "End":
			return focus(rows[rows.length - 1]);
		case "ArrowRight": {
			if (row.kind !== "folder") return;
			if (!row.expanded) return { type: "toggle", id };
			const next = rows[index + 1];
			return focus(next?.node.parentId === id ? next : undefined);
		}
		case "ArrowLeft":
			if (row.kind === "folder" && row.expanded && !row.locked) return { type: "toggle", id };
			return focus(rows.find((candidate) => candidate.node.id === row.node.parentId));
	}
};
