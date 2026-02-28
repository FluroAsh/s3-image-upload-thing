"use client";

import { useMemo, useState } from "react";

import { ExplorerProvider, useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";
import type { TreeNode } from "~/shared/types";

import { MainContent } from "./layout.main-content";
import { Sidebar } from "./layout.sidebar";
import { FileNode } from "./nodes/node.file";
import { FolderNode } from "./nodes/node.folder";
import { ImageCollectionNode } from "./nodes/node.image-collection";
import { extractFilename } from "./utils";

export const ExplorerLayout = () => {
	// TODO: https://github.com/bvaughn/react-resizable-panels/tree/main

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

const MIN_IMAGE_COLLECTION_SIZE = 1;

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

	// TODO: Tidy this up...
	const visibleNodes = useMemo(() => {
		const nodes: RenderTreeNode[] = [];

		const renderChildrenByFolder = (parentId: string) => {
			(childMap.get(parentId) || []).forEach((node) => {
				if (node.isFolder && node.childCount >= MIN_IMAGE_COLLECTION_SIZE) {
					const children = childMap.get(node.id) ?? [];

					// Folder object name should always be the same as the variant object name (minus variant prefix and .ext)
					const isImageCollection = children.every((child) => extractFilename(child.name) === node.name);

					if (isImageCollection) {
						nodes.push({
							...node,
							isImageCollection: true,
							variants: children,
						});

						return;
					}
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
			{visibleNodes.map((node) => (
				<li key={node.id}>
					{node.isFolder && node.isImageCollection && node.variants ? (
						<ImageCollectionNode variants={node.variants} node={node} previewSize="large" />
					) : node.isFolder ? (
						<FolderNode node={node} isExpanded={expanded[node.id]} toggleExpanded={toggleExpanded} />
					) : (
						<FileNode node={node} />
					)}
				</li>
			))}
		</ul>
	);
};
