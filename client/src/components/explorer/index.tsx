"use client";

import { useMemo, useState } from "react";

import {
	LucideAlertTriangle,
	LucideChevronRight,
	LucideFile,
	LucideFolderClosed,
	LucideFolderOpen,
	LucideImages,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSetSelection } from "@/hooks/useSetSelection";
import { getFileIcon } from "@/lib/helpers";
import { ExplorerProvider, useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { TreeNode } from "~/shared/types";

import { MainContent } from "./layout.main-content";
import { Sidebar } from "./layout.sidebar";
import { getDepthPadding, isSetFolder, setPathOf } from "./utils";

export const ExplorerLayout = () => {
	return (
		<ExplorerProvider>
			<div id="explorer-container" className="flex overflow-hidden size-full">
				<Sidebar />
				<MainContent />
			</div>
		</ExplorerProvider>
	);
};

type RenderTreeNode = TreeNode & {
	isImageCollection?: boolean;
	variants?: TreeNode[];
};

export const FileTree = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const toggleExpanded = (id: string) => {
		setExpanded((prev) => {
			const newState = { ...prev };
			const prevState = !!prev[id];
			newState[id] = !prevState;
			return newState;
		});
	};

	const visibleNodes = useMemo(() => {
		const nodes: RenderTreeNode[] = [];

		const renderChildrenByFolder = (parentId: string) => {
			(childMap.get(parentId) || []).forEach((node) => {
				const children = childMap.get(node.id) ?? [];

				if (isSetFolder(node, children)) {
					nodes.push({ ...node, isImageCollection: true, variants: children });
					return;
				}

				nodes.push(node); // Root level folder nodes
				if (expanded[node.id]) {
					renderChildrenByFolder(node.id);
				}
			});
		};

		renderChildrenByFolder(""); // "" maps the root nodes, and children
		return nodes;
	}, [childMap, expanded]);

	return (
		<ul>
			{visibleNodes.map((node) => {
				return node.isFolder && node.isImageCollection && node.variants ? (
					<ImageCollection key={node.id} variants={node.variants} node={node} />
				) : (
					<Node key={node.id} node={node} toggleExpanded={toggleExpanded} isExpanded={expanded[node.id]} />
				);
			})}
		</ul>
	);
};

type ImageVariantProps = {
	node: TreeNode;
	variants: TreeNode[];
};

/**
 * This component will not recursively render children, it is intended to be used immediately, and display a
 * collection of image variants for a given node (thumbnail, medium, large, etc.).
 */
const ImageCollection = ({ variants, node }: ImageVariantProps) => {
	const { isActive, select } = useSetSelection({ setPath: setPathOf(node.id), name: node.name, variants });

	return (
		<button
			type="button"
			aria-label={`Open image collection ${node.name}`}
			className={cn(
				"flex w-full items-center text-body hover:cursor-pointer select-none transition-colors duration-100 rounded-md p-2 mx-1 my-0.5 border-0 bg-transparent",
				isActive ? "bg-accent/12 text-fg" : "text-fg hover:bg-raised",
			)}
			style={{ paddingLeft: getDepthPadding(node.depth) }}
			onClick={select}
		>
			<div className="flex items-center gap-2">
				<LucideImages className="size-4 text-accent flex-shrink-0" />
				<span className="text-body truncate">{node.name}</span>
			</div>
			<span className="ml-auto font-mono text-caption text-fg-1">{variants.length}</span>
		</button>
	);
};

const File = ({ node }: { node: TreeNode }) => {
	const {
		actions: { setActiveFile },
		state: { bucketName, bucketRegion, activeFile },
	} = useExplorer();

	const { data: presignedUrls } = usePresignedUrls([node.id], bucketName, bucketRegion);
	const remoteURL = presignedUrls?.[node.id] ?? "";

	const generatedRemotePathname = `https://${bucketName}.s3.amazonaws.com/${node.id}`;
	const Icon = getFileIcon(generatedRemotePathname) || LucideFile;

	return (
		<button
			type="button"
			aria-label={`Open file ${node.name}`}
			className={cn(
				"flex w-full items-center text-body hover:cursor-pointer select-none transition-colors duration-100 rounded-md p-2 mx-1 my-0.5",
				remoteURL && activeFile.fileName === node.name ? "bg-accent/12 text-fg" : "text-fg hover:bg-raised",
			)}
			style={{ paddingLeft: getDepthPadding(node.depth) }}
			onClick={() => setActiveFile({ remoteURL, fileName: node.name })}
		>
			<div className="flex items-center gap-2">
				<Icon className="size-4 stroke-accent" />
				<span className="text-body truncate">{node.name}</span>
			</div>
			{node.size && <span className="ml-auto text-secondary text-fg-1">{node.size}</span>}
		</button>
	);
};

const Folder = ({
	node,
	isExpanded,
	toggleExpanded,
}: {
	node: TreeNode;
	isExpanded: boolean;
	toggleExpanded: (id: string) => void;
}) => {
	const FolderIcon = isExpanded ? LucideFolderOpen : LucideFolderClosed;

	const {
		actions: { setAttentionFolder },
	} = useExplorer();

	return (
		<div className="flex items-center">
			<button
				type="button"
				aria-expanded={isExpanded}
				aria-label={`${isExpanded ? "Collapse" : "Expand"} folder ${node.name}`}
				className={cn(
					"flex flex-1 items-center text-body rounded-md p-2 mx-1 my-0.5",
					"text-fg border-0 bg-transparent select-none transition-colors duration-100",
					"hover:bg-raised hover:cursor-pointer",
				)}
				style={{ paddingLeft: getDepthPadding(node.depth) }}
				onClick={() => toggleExpanded(node.id)}
			>
				<div className="flex items-center gap-2">
					<span className="flex size-4 items-center justify-center">
						<LucideChevronRight
							className={cn(
								"size-3.5 transition duration-75",
								isExpanded ? "stroke-fg-1 rotate-90" : "rotate-0 stroke-accent",
							)}
						/>
					</span>
					<FolderIcon className="size-4 stroke-accent" />
					<span className="text-body font-medium truncate">{node.name}</span>
				</div>

				{node.childCount > 0 && <span className="ml-auto text-secondary text-fg-1">{node.childCount}</span>}
			</button>
			<Button
				variant="icon"
				aria-label={`Show sets needing attention in ${node.name}`}
				title="Sets needing attention"
				className="hover:text-warn"
				onClick={() => setAttentionFolder(setPathOf(node.id))}
			>
				<LucideAlertTriangle className="size-4" />
			</Button>
		</div>
	);
};

const Node = ({
	node,
	toggleExpanded,
	isExpanded,
}: {
	node: TreeNode;
	toggleExpanded: (id: string) => void;
	isExpanded: boolean;
}) =>
	node.isFolder ? <Folder node={node} isExpanded={isExpanded} toggleExpanded={toggleExpanded} /> : <File node={node} />;
