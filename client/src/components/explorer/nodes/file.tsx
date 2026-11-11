import { LucideFile } from "lucide-react";

import { getFileIcon } from "@/lib/helpers";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { usePresignedUrls } from "@/lib/query";

import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

export const FileNode = ({ row, query, tabbable, onFocus }: NodeProps) => {
	const { node } = row;
	const {
		actions: { setActiveFile },
		state: { bucketName, bucketRegion, activeFile },
	} = useExplorer();
	const { data: presignedUrls } = usePresignedUrls([node.id], bucketName, bucketRegion);
	const remoteURL = presignedUrls?.[node.id] ?? "";
	const Icon = getFileIcon(`https://${bucketName}.s3.amazonaws.com/${node.id}`) || LucideFile;

	return (
		<TreeRow
			id={node.id}
			depth={node.depth}
			selected={!!remoteURL && !activeFile.setPath && activeFile.remoteURL === remoteURL}
			tabbable={tabbable}
			meta={node.size}
			onActivate={() => setActiveFile({ remoteURL, fileName: node.name })}
			onFocus={onFocus}
		>
			<Icon className="size-4 shrink-0 text-fg-2" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
