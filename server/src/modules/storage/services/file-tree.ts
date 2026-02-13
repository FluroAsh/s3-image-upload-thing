import type { _Object } from "@aws-sdk/client-s3";

import type { TreeNode } from "@shared/types";

import type { ValidObject } from "@/shared/types/s3";
import { readableSize } from "@/shared/utils/helpers";

// ---------------------------------------------------------------------------
// Key parsing & sorting
// ---------------------------------------------------------------------------

/** Used to parse the key of an S3 object into its segments, name, depth, isFolder, and parentId. */
const parseKey = (key: string) => {
  const segments = key.split("/").filter(Boolean);
  const parentSegments = segments.slice(0, -1);

  return {
    segments,
    name: segments[segments.length - 1],
    depth: segments.length - 1,
    isFolder: key.endsWith("/"),
    // Parent folder path, empty string for root-level nodes
    parentId: parentSegments.length ? parentSegments.join("/") + "/" : "",
  };
};

const naturalSort = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const sortNodes = (a: TreeNode, b: TreeNode): number => {
  if (a.depth !== b.depth) return a.depth - b.depth;
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
  return naturalSort(a.name, b.name);
};

// ---------------------------------------------------------------------------
// Tree indexing
// ---------------------------------------------------------------------------

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
    childrenMap.get(parentId)!.push(childKey);
  };

  for (const obj of objects) {
    const { segments, parentId } = parseKey(obj.Key);
    addChild(parentId, obj.Key);

    // Walk ancestor segments to find folders not stored as real objects
    for (let i = 1; i < segments.length; i++) {
      const folderPath = segments.slice(0, i).join("/") + "/";
      if (!existingKeys.has(folderPath)) {
        impliedFolders.add(folderPath);
      }
    }
  }

  // Implied folders are also children of their parents
  impliedFolders.forEach((folderPath) => {
    const { parentId } = parseKey(folderPath);
    addChild(parentId, folderPath);
  });

  return { childrenMap, impliedFolders };
};

// ---------------------------------------------------------------------------
// Node creation
// ---------------------------------------------------------------------------

const createNode = (
  key: string,
  childrenMap: Map<string, string[]>,
  size?: number,
): TreeNode => {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transforms a flat list of S3 objects into a sorted flat tree
 * with parent/child relationships and implied folder nodes.
 */
export const constructFileTree = ({
  objects,
}: {
  objects: _Object[];
}): TreeNode[] => {
  const validObjects = objects.filter(
    (obj): obj is ValidObject => obj.Key !== undefined,
  );

  if (!validObjects.length) return [];

  const { childrenMap, impliedFolders } = buildTreeIndex(validObjects);

  const folderNodes = Array.from(impliedFolders).map((key) =>
    createNode(key, childrenMap),
  );

  const objectNodes = validObjects.map((obj) =>
    createNode(obj.Key, childrenMap, obj.Size),
  );

  return [...folderNodes, ...objectNodes].sort(sortNodes);
};
