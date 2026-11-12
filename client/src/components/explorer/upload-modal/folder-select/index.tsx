import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { LucideChevronRight, LucideFolder, LucideFolderPlus } from "lucide-react";

import { filterNeedle, formatCount, isSetFolder, matchesFilter, setPathOf } from "@/components/explorer/utils";
import { Button } from "@/components/ui/button";
import { FilterInput } from "@/components/ui/filter-input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { SECTION_LABEL } from "@/components/ui/section-label";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { FileTreeResponse, TreeNode } from "~/shared/types";

import { useUpload } from "../provider";

const isFolder = ({ isFolder }: TreeNode) => isFolder;

const Breadcrumb = ({ bucketName }: { bucketName: string }) => {
	const { destination, setDestination } = useUpload();
	const segments = destination ? destination.split("/") : [];
	const crumbs = [bucketName, ...segments];

	return (
		<nav aria-label="Destination" className="flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-secondary">
			{crumbs.map((crumb, index) => {
				const last = index === crumbs.length - 1;
				return (
					<span key={segments.slice(0, index).join("/") || "root"} className="flex shrink-0 items-center gap-1">
						{last ? (
							<span aria-current="page" className="text-fg">
								{crumb}
							</span>
						) : (
							<button
								type="button"
								className="text-fg-2 hover:text-fg"
								onClick={() => setDestination(segments.slice(0, index).join("/"))}
							>
								{crumb}
							</button>
						)}
						{!last && <span className="text-fg-2">/</span>}
					</span>
				);
			})}
		</nav>
	);
};

export const FolderSelect = () => {
	const qc = useQueryClient();
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const { destination, setDestination } = useUpload();

	const [filter, setFilter] = useState("");
	const [naming, setNaming] = useState(false);

	const folderId = destination ? `${destination}/` : "";
	const subFolders = (id: string) =>
		(childMap.get(id) ?? []).filter((node) => isFolder(node) && !isSetFolder(node, childMap.get(node.id)));
	const folders = subFolders(folderId).filter(({ name }) => matchesFilter(name, filterNeedle(filter)));
	const currentName = destination.split("/").pop() || bucketName;

	const open = (path: string) => {
		setFilter("");
		setDestination(path);
	};

	const handleCreateFolder = (name: string) => {
		const newFolder: TreeNode = {
			id: `${folderId}${name}/`,
			parentId: folderId,
			name,
			isFolder: true,
			depth: destination ? destination.split("/").length : 0,
			childCount: 0,
			size: "",
			presignedUrl: "",
		};

		qc.setQueryData<FileTreeResponse>(["fileTree", bucketName], (oldData) =>
			oldData ? { ...oldData, tree: [...oldData.tree, newFolder] } : { tree: [newFolder], partial: false },
		);
		open(destination ? `${destination}/${name}` : name);
		setNaming(false);
	};

	return (
		<section aria-label="Destination" className="mb-4">
			<h3 className={cn(SECTION_LABEL, "mb-1.5 flex h-6 items-center")}>Destination</h3>
			<div className="rounded-md border border-line bg-panel">
				<div className="flex h-9 items-center gap-2 border-b border-line px-2">
					<Breadcrumb bucketName={bucketName} />
					<FilterInput
						wrapperClassName="w-[150px] shrink-0"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						placeholder="Filter folders…"
						aria-label="Filter folders"
					/>
					<Button variant="ghost" onClick={() => setNaming(true)}>
						<LucideFolderPlus className="size-3.5" />
						New folder
					</Button>
				</div>

				{folders.length > 0 ? (
					<ul className="max-h-[140px] overflow-y-auto">
						{folders.map((node) => {
							const count = subFolders(node.id).length;
							return (
								<li key={node.id}>
									<button
										type="button"
										className="flex h-row w-full items-center gap-2 px-2 text-left text-body text-fg hover:bg-raised"
										onClick={() => open(setPathOf(node.id))}
									>
										<LucideFolder className="size-3.5 shrink-0 text-fg-1" />
										<span className="flex-1 truncate">{node.name}</span>
										{count > 0 && (
											<span className="font-mono text-caption text-fg-2">{formatCount(count, "folder", false)}</span>
										)}
										<LucideChevronRight className="size-3 shrink-0 text-fg-2" />
									</button>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="px-2 py-3 text-center text-secondary text-fg-1">
						{filter ? `No folders match "${filter}".` : `No sub-folders in ${currentName}. Files upload here.`}
					</p>
				)}
			</div>

			<PromptDialog
				open={naming}
				onOpenChange={setNaming}
				title="New folder"
				subtitle={`in ${destination || bucketName}`}
				label="Name"
				hint="Created on first upload"
				confirmLabel="Create"
				validate={(name) => (name.includes("/") ? 'A folder name can\'t contain "/".' : undefined)}
				onSubmit={handleCreateFolder}
			/>
		</section>
	);
};
