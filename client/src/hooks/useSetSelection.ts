import { useExplorer } from "@/lib/providers/explorer-provider";
import { usePresignedUrls } from "@/lib/query";
import type { TreeNode } from "~/shared/types";

import { pickPreviewVariant } from "@/components/explorer/utils";

type SetSelectionProps = {
	/** Path of the set folder without a trailing slash. */
	setPath: string;
	name: string;
	variants: TreeNode[];
};

/** Opens a set in the details panel; the file tree and the attention list select a set the same way. */
export const useSetSelection = ({ setPath, name, variants }: SetSelectionProps) => {
	const {
		actions: { setActiveFile },
		state: { bucketName, bucketRegion, activeFile },
	} = useExplorer();

	const { data: presignedUrls = {} } = usePresignedUrls(
		variants.map((v) => v.id),
		bucketName,
		bucketRegion,
	);

	const previewVariant = pickPreviewVariant(variants);
	const remoteURL = (previewVariant && presignedUrls[previewVariant.id]) ?? "";

	const select = () =>
		setActiveFile({
			remoteURL,
			fileName: name,
			setPath,
			variants: variants.map((variant) => ({ ...variant, presignedUrl: presignedUrls[variant.id] })),
		});

	return { isActive: activeFile.setPath === setPath, select };
};
