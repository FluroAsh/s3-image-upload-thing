"use client";

import { LucideFile } from "lucide-react";

import { getFileIcon } from "@/lib/helpers";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { TreeNode } from "~/shared/types";

import { FileContextMenuItems } from "../../context-menu/items.file";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../ui/context-menu";
import { getDepthPadding } from "../utils";

type FileNodeProps = {
	node: TreeNode;
};

export const FileNode = ({ node }: FileNodeProps) => {
	const {
		actions: { setActiveFile },
		state: { bucketName, bucketRegion, activeFile },
	} = useExplorer();

	const { data: presignedUrls } = usePresignedUrls([node.id], bucketName, bucketRegion);
	const remoteURL = presignedUrls?.[node.id] ?? "";

	const generatedRemotePathname = `https://${bucketName}.s3.amazonaws.com/${node.id}`;
	const Icon = getFileIcon(generatedRemotePathname) || LucideFile;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Open file ${node.name}`}
					className={cn(
						"flex w-full items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5",
						remoteURL && activeFile.fileName === node.name
							? "bg-sky-600 text-neutral-100 border border-sky-500"
							: "text-neutral-100 hover:bg-slate-700 hover:text-neutral-100",
					)}
					style={{ paddingLeft: getDepthPadding(node.depth) }}
					onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
				>
					<div className="flex items-center gap-2">
						<Icon className="size-4 stroke-sky-400" />
						<span className="text-sm truncate">{node.name}</span>
					</div>
					{node.size && <span className="ml-auto text-xs text-slate-400">{node.size}</span>}
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<FileContextMenuItems previewUrl={remoteURL} />
			</ContextMenuContent>
		</ContextMenu>
	);
};
