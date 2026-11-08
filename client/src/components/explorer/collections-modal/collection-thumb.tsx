import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { ImageVariant, TreeNode } from "~/shared/types";

import { PREVIEW_ORDER, pickPreviewVariant } from "../utils";

const THUMBNAIL_FIRST: ImageVariant[] = ["thumbnail", ...PREVIEW_ORDER];

export const CollectionThumb = ({
	folder,
	className = "size-16",
}: {
	folder: TreeNode | undefined;
	className?: string;
}) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);

	const variants = childMap.get(folder?.id ?? "") ?? [];
	const variant = pickPreviewVariant(variants, THUMBNAIL_FIRST);
	const { data } = usePresignedUrls(variant ? [variant.id] : [], bucketName, bucketRegion);
	const url = variant && data?.[variant.id];

	return (
		<div className={cn("shrink-0 rounded-md bg-slate-700 overflow-hidden", className)}>
			{url && <img src={url} alt="" className="size-full object-cover" />}
		</div>
	);
};
