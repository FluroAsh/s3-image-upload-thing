import { createContext, type ReactNode, useContext, useState } from "react";

import { LucideImages } from "lucide-react";

import { useInView } from "@/hooks/useInView";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { ImageVariant, TreeNode } from "~/shared/types";

import { PREVIEW_ORDER, pickPreviewVariant } from "../utils";

const THUMBNAIL_FIRST: ImageVariant[] = ["thumbnail", ...PREVIEW_ORDER];

/** The picker's scroll container, which row thumbnails watch to know when they come into view. */
export const ThumbRootContext = createContext<Element | null>(null);

export const SetIcon = ({ className }: { className: string }) => (
	<LucideImages className={cn("shrink-0 text-fg-2", className)} />
);

export const CollectionThumb = ({
	folder,
	className = "size-8",
	only,
	enabled = true,
	fallback,
	fallbackClassName,
}: {
	folder: TreeNode | undefined;
	className?: string;
	/** Variants to choose from, in order; without it a larger size stands in for a missing thumbnail. */
	only?: ImageVariant[];
	/** False until the image is wanted; no URL is requested before. */
	enabled?: boolean;
	/** Shown instead of an empty square when the set has no such variant or the image fails to load. */
	fallback?: ReactNode;
	/** Extra classes for the square while the fallback shows. */
	fallbackClassName?: string;
}) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const [failed, setFailed] = useState(false);

	const variants = childMap.get(folder?.id ?? "") ?? [];
	const variant = pickPreviewVariant(variants, only ?? THUMBNAIL_FIRST);
	const { data, isError } = usePresignedUrls(variant && enabled ? [variant.id] : [], bucketName, bucketRegion);
	const url = variant && data?.[variant.id];
	const missing = fallback && (!variant || failed || isError);

	return (
		<div
			className={cn(
				"shrink-0 rounded-md bg-raised overflow-hidden",
				missing && "grid place-items-center",
				missing && fallbackClassName,
				className,
			)}
		>
			{missing
				? fallback
				: url && <img src={url} alt="" className="size-full object-cover" onError={() => setFailed(true)} />}
		</div>
	);
};

/** A set row's 20px thumbnail, which asks for its image only once the row has scrolled into the picker. */
export const RowThumb = ({ folder }: { folder: TreeNode }) => {
	const [ref, seen] = useInView(useContext(ThumbRootContext));

	return (
		<div ref={ref} className="shrink-0">
			<CollectionThumb
				folder={folder}
				className="size-5 rounded-sm"
				only={["thumbnail"]}
				enabled={seen}
				fallback={<SetIcon className="size-3.5" />}
			/>
		</div>
	);
};
