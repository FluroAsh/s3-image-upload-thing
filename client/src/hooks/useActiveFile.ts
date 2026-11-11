import { pickPreviewVariant, setPathOf } from "@/components/explorer/utils";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";

/** The selected file or set, read live from the file tree so it follows refetches and re-signed URLs; `null` when nothing is selected or the node is gone. */
export const useActiveFile = () => {
	const { bucketName, bucketRegion, selection } = useExplorer().state;
	const { childMap, data } = useFileTree(bucketName, bucketRegion);

	const node = selection ? data?.tree.find(({ id }) => id === selection.id) : undefined;
	const variants = selection?.kind === "set" ? (childMap.get(selection.id) ?? []) : [];
	const previewNode = selection?.kind === "set" ? pickPreviewVariant(variants) : node;

	const { data: urls = {} } = usePresignedUrls(
		selection?.kind === "set" ? variants.map(({ id }) => id) : node ? [node.id] : [],
		bucketName,
		bucketRegion,
	);

	if (!selection || !node) return null;

	return {
		...selection,
		name: node.name,
		/** Folder the node sits in, `""` at the bucket root. */
		folder: node.parentId,
		/** CDN path of the image set, which collections key on; only for a set. */
		setPath: selection.kind === "set" ? setPathOf(selection.id) : undefined,
		size: node.size,
		/** The file, or a set's preview size; its name decides how the panel previews it. */
		previewNode,
		remoteURL: (previewNode && urls[previewNode.id]) ?? "",
		variants: variants.map((variant) => ({ ...variant, presignedUrl: urls[variant.id] })),
	};
};

export type ActiveFile = NonNullable<ReturnType<typeof useActiveFile>>;
