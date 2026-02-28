"use client";

import { LucideImages } from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { ImageVariant, TreeNode } from "~/shared/types";

import type { DownloadVariant } from "../../context-menu/items.actions";
import { ImageCollectionContextMenuItems } from "../../context-menu/items.image-collection";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../ui/context-menu";
import { extractVariantLabel, getDepthPadding } from "../utils";

type ImageCollectionNodeProps = {
	node: TreeNode;
	variants: TreeNode[];
	/** Used for setting the desired size for the image preview in the Explorer's "active" panel — by default this is "large". */
	previewSize?: ImageVariant;
};

/**
 * Displays a collection of image variants for a given node (thumbnail, medium, large, etc.).
 * Does not recursively render children.
 */
export const ImageCollectionNode = ({ variants, node, previewSize = "large" }: ImageCollectionNodeProps) => {
	const {
		actions: { setActiveFile },
		state: { bucketName, bucketRegion, activeFile },
	} = useExplorer();

	const { data: presignedUrls = {} } = usePresignedUrls(
		variants.map((v) => v.id),
		bucketName,
		bucketRegion,
	);

	const resizedVariant =
		variants.find((variant) => variant.name.startsWith(previewSize)) || variants[variants.length - 1];

	const remoteURL = presignedUrls[resizedVariant.id];

	const downloadVariants: DownloadVariant[] = variants.map((v) => ({
		id: v.id,
		label: extractVariantLabel(v.name),
		size: v.size,
		url: presignedUrls[v.id],
	}));

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Open image collection ${node.name}`}
					className={cn(
						"flex w-full items-center text-sm hover:cursor-pointer select-none transition-colors duration-200 rounded-md p-2 mx-1 my-0.5 border-0 bg-transparent",
						remoteURL && activeFile.fileName === node.name
							? "bg-sky-800/30 text-neutral-100 border border-sky-800/30"
							: "text-neutral-100 hover:bg-slate-700 hover:text-neutral-100",
					)}
					style={{ paddingLeft: getDepthPadding(node.depth) }}
					onClick={() => {
						setActiveFile({
							remoteURL: presignedUrls[resizedVariant.id],
							fileName: node.name,
							variants: variants.map((variant) => ({
								...variant,
								presignedUrl: presignedUrls[variant.id],
							})),
						});
					}}
				>
					<div className="flex items-center gap-2">
						<LucideImages className="size-4 text-sky-400 flex-shrink-0" />
						<span className="text-sm truncate">{node.name}</span>
					</div>
					<span className="ml-auto text-xs bg-slate-700 text-sky-400 px-2 py-0.5 rounded-full">{variants.length}</span>
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ImageCollectionContextMenuItems variants={downloadVariants} />
			</ContextMenuContent>
		</ContextMenu>
	);
};
