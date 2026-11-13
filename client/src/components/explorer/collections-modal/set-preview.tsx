import type { Point } from "@/hooks/usePointerPosition";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { INLINE_VARIANTS } from "~/shared/constants/image-variants";
import type { ImageVariant, TreeNode } from "~/shared/types";

import { PreviewBox } from "../hover-preview";
import { pickPreviewVariant } from "../utils";

const LARGER_FIRST: ImageVariant[] = [...INLINE_VARIANTS, "full"];

/** Previews a set from its sizes; mounted only after the hover delay, so nothing is requested before. */
export const SetPreview = ({ folder, start }: { folder: TreeNode; start: Point }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);

	const variants = childMap.get(folder.id) ?? [];
	const large = pickPreviewVariant(variants, LARGER_FIRST);
	const thumb = pickPreviewVariant(variants, ["thumbnail"]) ?? large;
	const { data: thumbData } = usePresignedUrls(thumb ? [thumb.id] : [], bucketName, bucketRegion);
	const { data: largeData } = usePresignedUrls(large ? [large.id] : [], bucketName, bucketRegion);
	const thumbUrl = thumb && thumbData?.[thumb.id];

	return thumbUrl ? <PreviewBox thumbSrc={thumbUrl} largeSrc={large && largeData?.[large.id]} start={start} /> : null;
};
