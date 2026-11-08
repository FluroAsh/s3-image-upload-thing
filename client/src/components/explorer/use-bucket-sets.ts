import { useMemo } from "react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";

import { setFoldersUnder, setPathOf } from "./utils";

/** Set paths of this bucket mapped to their folder, which holds the variant files. */
export const useBucketSets = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const tree = useFileTree(bucketName, bucketRegion);

	const sets = useMemo(
		() =>
			new Map(
				setFoldersUnder(tree.childMap, "").map((folder) => [setPathOf(tree.data?.cdnPrefix ?? "", folder.id), folder]),
			),
		[tree.childMap, tree.data?.cdnPrefix],
	);

	return { ...tree, sets };
};
