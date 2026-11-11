import { LucideFile } from "lucide-react";

import { getFileIcon } from "@/lib/helpers";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { FileMenu } from "./menus";
import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

export const FileNode = ({ row, query, tabbable, onFocus }: NodeProps) => {
	const { node } = row;
	const {
		actions: { select },
		state: { selection },
	} = useExplorer();
	const Icon = getFileIcon(node.name) || LucideFile;
	const open = () => select({ id: node.id, kind: "file" });

	return (
		<TreeRow
			id={node.id}
			depth={node.depth}
			selected={selection?.kind === "file" && selection.id === node.id}
			tabbable={tabbable}
			meta={node.size}
			menu={<FileMenu row={row} onOpen={open} />}
			onActivate={open}
			onFocus={onFocus}
		>
			<Icon className="size-4 shrink-0 text-fg-2" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
