import { LucideFolderClosed, LucideFolderOpen } from "lucide-react";

import { FolderMenu } from "./menus";
import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

type FolderProps = NodeProps & {
	onToggle: () => void;
};

export const FolderNode = ({ row, query, tabbable, onFocus, onToggle, assign }: FolderProps) => {
	const { node, expanded, count } = row;
	const Icon = expanded ? LucideFolderOpen : LucideFolderClosed;

	return (
		<TreeRow
			id={node.id}
			label={node.name}
			depth={node.depth}
			selected={false}
			expanded={expanded}
			tabbable={tabbable}
			meta={count || undefined}
			menu={<FolderMenu row={row} onToggle={onToggle} assign={assign} />}
			onActivate={onToggle}
			onFocus={onFocus}
		>
			<Icon className="size-4 shrink-0 text-fg-1" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
