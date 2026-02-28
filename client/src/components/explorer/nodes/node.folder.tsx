"use client";

import { LucideChevronRight, LucideFolderClosed, LucideFolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TreeNode } from "~/shared/types";

import { FolderContextMenuItems } from "../../context-menu/items.folder";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../ui/context-menu";
import { getDepthPadding } from "../utils";

type FolderNodeProps = {
	node: TreeNode;
	isExpanded: boolean;
	toggleExpanded: (id: string) => void;
};

export const FolderNode = ({ node, isExpanded, toggleExpanded }: FolderNodeProps) => {
	const FolderIcon = isExpanded ? LucideFolderOpen : LucideFolderClosed;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					aria-expanded={isExpanded}
					aria-label={`${isExpanded ? "Collapse" : "Expand"} folder ${node.name}`}
					className={cn(
						"flex w-full items-center text-sm rounded-md p-2 mx-1 my-0.5",
						"text-neutral-100 border-0 bg-transparent select-none transition-colors duration-200",
						"hover:bg-slate-700 hover:text-neutral-100 hover:cursor-pointer",
					)}
					style={{ paddingLeft: getDepthPadding(node.depth) }}
					onClick={() => toggleExpanded(node.id)}
				>
					<div className="flex items-center gap-2">
						<span className="flex size-4 items-center justify-center">
							<LucideChevronRight
								className={cn(
									"size-3.5 transition duration-75",
									isExpanded ? "stroke-slate-400 rotate-90" : "rotate-0 stroke-sky-400",
								)}
							/>
						</span>
						<FolderIcon className="size-4 stroke-sky-400" />
						<span className="text-sm font-medium truncate">{node.name}</span>
					</div>

					{node.childCount > 0 && <span className="ml-auto text-xs text-slate-400">{node.childCount}</span>}
				</button>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<FolderContextMenuItems />
			</ContextMenuContent>
		</ContextMenu>
	);
};
