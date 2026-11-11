import { LucideAlertTriangle, LucideFolderClosed, LucideFolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { setPathOf } from "../utils";
import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

type FolderProps = NodeProps & {
	onToggle: () => void;
};

export const FolderNode = ({ row, query, tabbable, onFocus, onToggle }: FolderProps) => {
	const { node, expanded, count } = row;
	const {
		actions: { setAttentionFolder },
	} = useExplorer();
	const Icon = expanded ? LucideFolderOpen : LucideFolderClosed;

	return (
		<TreeRow
			id={node.id}
			depth={node.depth}
			selected={false}
			expanded={expanded}
			tabbable={tabbable}
			meta={count || undefined}
			actions={
				<Button
					variant="icon"
					tabIndex={-1}
					aria-label={`Show sets needing attention in ${node.name}`}
					title="Sets needing attention"
					className="size-5 opacity-0 hover:text-warn focus-visible:opacity-100 group-hover:opacity-100"
					onClick={(event) => {
						event.stopPropagation();
						setAttentionFolder(setPathOf(node.id));
					}}
				>
					<LucideAlertTriangle className="size-3.5" />
				</Button>
			}
			onActivate={onToggle}
			onFocus={onFocus}
		>
			<Icon className="size-4 shrink-0 text-fg-1" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
