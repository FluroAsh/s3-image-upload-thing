import { type MutableRefObject, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { LucideArrowLeft, LucideFolder, LucideFolderPlus, LucideSearch } from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";
import type { FileTreeResponse, TreeNode } from "~/shared/types";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";

import { Folder } from "./folder";

const isFolder = (node: TreeNode) => node.isFolder;

const findCurrentFolders = (childMap: Map<string, TreeNode[]>, activeNodeId: string, searchQuery: string) => {
	const folders = (childMap.get(activeNodeId) ?? []).filter(isFolder);

	return searchQuery ? folders.filter((node) => node.name.toLowerCase().includes(searchQuery.toLowerCase())) : folders;
};

export const FolderSelect = ({ folderPathRef }: { folderPathRef: MutableRefObject<string> }) => {
	const qc = useQueryClient();
	const { bucketName: activeBucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(activeBucketName, bucketRegion);

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [folderStack, setFolderStack] = useState<TreeNode[]>([]);

	const activeFolder = folderStack[folderStack.length - 1] || undefined;
	const activeNodeId = activeFolder?.id ?? ""; // "" is the root parent

	const currentFolders = findCurrentFolders(childMap, activeNodeId, searchQuery);

	const handleBack = () => {
		setFolderStack((prev) => {
			const newStack = prev.slice(0, -1);
			folderPathRef.current = newStack.map((n) => n.name).join("/");
			return newStack;
		});
	};

	const handleFolderSelect = (node: TreeNode) => {
		setFolderStack((prev) => {
			const newStack = [...prev, node];
			folderPathRef.current = newStack.map((n) => n.name).join("/");
			return newStack;
		});
	};

	const handleCreateFolder = () => {
		const newFolderName = prompt("Enter new folder name:");
		if (!newFolderName) return;

		const newFolder: TreeNode = {
			id: activeNodeId ? `${activeNodeId}/${newFolderName}` : `${newFolderName}/`,
			parentId: activeNodeId,
			name: newFolderName,
			isFolder: true,
			depth: activeFolder ? activeFolder.depth + 1 : 0,
			childCount: 0,
			size: "",
			presignedUrl: "",
		};

		qc.setQueryData<FileTreeResponse>(["fileTree", activeBucketName], (oldData) =>
			oldData ? { ...oldData, tree: [...oldData.tree, newFolder] } : { tree: [newFolder], partial: false },
		);

		setFolderStack((prev) => [...prev, newFolder]);
		folderPathRef.current = [...folderStack.map((n) => n.name), newFolderName].join("/");
	};

	return (
		// Header
		<div className="mb-4">
			<div className="mb-4 flex justify-between items-center">
				<div className="text-fg-1">
					<Chip>{activeNodeId ? activeNodeId : activeBucketName}</Chip>
				</div>

				<Button onClick={handleCreateFolder}>
					<LucideFolderPlus className="size-4" />
					New Folder
				</Button>
			</div>

			{/* Search/Navigation */}
			<div className="flex gap-x-2 mb-4">
				<div className="relative w-full">
					<Input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8"
						placeholder="Search folders..."
					/>
					<LucideSearch className="absolute top-1/2 left-2 size-4 text-fg-2 transform -translate-y-1/2" />
				</div>

				<Button onClick={handleBack}>
					<LucideArrowLeft className="size-4" />
					Back
				</Button>
			</div>

			{currentFolders.length > 0 ? (
				<div className="grid grid-cols-5 gap-4 overflow-x-hidden h-[300px] p-4 rounded-md border border-line-strong">
					{currentFolders.map((folderNode) => (
						<Folder key={folderNode.id} name={folderNode.name} onClick={() => handleFolderSelect(folderNode)} />
					))}
				</div>
			) : (
				<div className="mb-4">
					<div className="p-4 rounded-md border border-line-strong h-[300px] grid place-items-center">
						<div>
							<LucideFolder className="size-12 mx-auto mb-4 stroke-fg-2" />
							{activeFolder ? (
								<span className="text-fg-1">
									Looks like
									<Chip className="mx-2">{activeFolder.name}</Chip>
									is empty!
								</span>
							) : (
								<span className="text-fg-1">No folders found in {activeBucketName}</span>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
