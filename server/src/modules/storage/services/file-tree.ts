import type { _Object } from "@aws-sdk/client-s3";

import type { ValidObject } from "@/shared/types/s3";
import { readableSize } from "@/shared/utils/helpers";
import type { TreeNode } from "~/shared/types";

import { isSetManifest } from "./manifest";

const parseKey = (key: string) => {
	const segments = key.split("/").filter(Boolean);
	const parentSegments = segments.slice(0, -1);

	return {
		segments,
		name: segments[segments.length - 1],
		depth: segments.length - 1,
		isFolder: key.endsWith("/"),
		parentId: parentSegments.length ? `${parentSegments.join("/")}/` : "",
	};
};

const naturalSort = (a: string, b: string): number =>
	a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const sortNodes = (a: TreeNode, b: TreeNode): number => {
	if (a.depth !== b.depth) return a.depth - b.depth;
	if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
	return naturalSort(a.name, b.name);
};

type TreeIndex = {
	childrenMap: Map<string, string[]>;
	impliedFolders: Set<string>;
};

/**
 * S3 only stores objects, not folders. Folders are either explicit
 * (zero-byte objects with a trailing slash) or implied by the path
 * segments of other objects. This function discovers both kinds and
 * maps each parent path to its direct children so we can compute
 * childCount in O(1) per node.
 */
const buildTreeIndex = (objects: ValidObject[]): TreeIndex => {
	const childrenMap = new Map<string, string[]>();
	const impliedFolders = new Set<string>();
	const existingKeys = new Set(objects.map((obj) => obj.Key));

	const addChild = (parentId: string, childKey: string) => {
		if (!childrenMap.has(parentId)) {
			childrenMap.set(parentId, []);
		}
		childrenMap.get(parentId)?.push(childKey);
	};

	for (const obj of objects) {
		const { segments, parentId } = parseKey(obj.Key);
		addChild(parentId, obj.Key);

		for (let i = 1; i < segments.length; i++) {
			const folderPath = `${segments.slice(0, i).join("/")}/`;
			if (!existingKeys.has(folderPath)) {
				impliedFolders.add(folderPath);
			}
		}
	}

	impliedFolders.forEach((folderPath) => {
		const { parentId } = parseKey(folderPath);
		addChild(parentId, folderPath);
	});

	return { childrenMap, impliedFolders };
};

const createNode = (key: string, childrenMap: Map<string, string[]>, size?: number): TreeNode => {
	const { parentId, name, depth, isFolder } = parseKey(key);

	return {
		id: key,
		parentId,
		name,
		depth,
		isFolder,
		childCount: isFolder ? (childrenMap.get(key)?.length ?? 0) : 0,
		size: size ? readableSize(size) : undefined,
	};
};

export const constructFileTree = ({ objects }: { objects: _Object[] }): TreeNode[] => {
	const withKey = objects.filter((obj): obj is ValidObject => obj.Key !== undefined);
	const keys = new Set(withKey.map(({ Key }) => Key));
	// A set's manifest is not one of its images, and beside them it would stop the explorer seeing the folder as a set.
	const validObjects = withKey.filter(({ Key }) => !isSetManifest(Key, keys));

	if (!validObjects.length) return [];

	const { childrenMap, impliedFolders } = buildTreeIndex(validObjects);

	const folderNodes = Array.from(impliedFolders).map((key) => createNode(key, childrenMap));

	const objectNodes = validObjects.map((obj) => createNode(obj.Key, childrenMap, obj.Size));

	return [...folderNodes, ...objectNodes].sort(sortNodes);
};
