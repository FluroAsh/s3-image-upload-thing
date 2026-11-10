import { useMemo } from "react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";
import type { TreeNode } from "~/shared/types";

import { setFoldersUnder, setPathOf } from "../utils";

export const useBucketSets = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const tree = useFileTree(bucketName, bucketRegion);

	const sets = useMemo(
		() =>
			new Map<string, TreeNode>(
				setFoldersUnder(tree.childMap, "").map((folder): [string, TreeNode] => [setPathOf(folder.id), folder]),
			),
		[tree.childMap],
	);

	return { ...tree, sets };
};
