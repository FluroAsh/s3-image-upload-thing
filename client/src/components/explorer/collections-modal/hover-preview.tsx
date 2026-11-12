import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { type Point, usePointerPosition } from "@/hooks/usePointerPosition";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import { INLINE_VARIANTS } from "~/shared/constants/image-variants";
import type { ImageVariant, TreeNode } from "~/shared/types";

import { type PreviewShape, pickPreviewVariant, placeBesideCursor, previewShapeOf } from "../utils";

const HOVER_DELAY_MS = 150;

const LARGER_FIRST: ImageVariant[] = [...INLINE_VARIANTS, "full"];

const SHAPE_CLASS = {
	square: "size-60",
	landscape: "h-40 w-60",
	portrait: "h-60 w-40",
} as const satisfies Record<PreviewShape, string>;

/** Boxed larger image beside the cursor; mounted on hover, it waits out the delay before requesting anything. */
export const HoverPreview = ({ folder, start, onClose }: { folder: TreeNode; start: Point; onClose: () => void }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const boxRef = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState(false);
	const [shape, setShape] = useState<PreviewShape>();
	const [largeLoaded, setLargeLoaded] = useState(false);

	const variants = childMap.get(folder.id) ?? [];
	const thumb = pickPreviewVariant(variants, ["thumbnail"]);
	const large = pickPreviewVariant(variants, LARGER_FIRST);
	const { data: thumbData } = usePresignedUrls(shown && thumb ? [thumb.id] : [], bucketName, bucketRegion);
	const { data: largeData } = usePresignedUrls(shown && large ? [large.id] : [], bucketName, bucketRegion);
	const thumbUrl = thumb && thumbData?.[thumb.id];
	const largeUrl = large && largeData?.[large.id];

	const place = () => {
		const box = boxRef.current;
		if (!box) return;
		const { x, y } = placeBesideCursor(
			cursor.current,
			{ width: box.offsetWidth, height: box.offsetHeight },
			{ width: window.innerWidth, height: window.innerHeight },
		);
		box.style.transform = `translate(${x}px, ${y}px)`;
	};
	const cursor = usePointerPosition(start, place);

	/** Re-places after any render that may have resized the box, such as the shape being set. */
	useLayoutEffect(() => place());

	useEffect(() => {
		const timer = setTimeout(() => setShown(true), HOVER_DELAY_MS);
		window.addEventListener("scroll", onClose, true);
		window.addEventListener("keydown", onClose);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("scroll", onClose, true);
			window.removeEventListener("keydown", onClose);
		};
	}, [onClose]);

	if (!thumbUrl) return null;

	return createPortal(
		<div
			ref={boxRef}
			className={cn(
				"pointer-events-none fixed top-0 left-0 z-50 rounded-md border border-line bg-raised p-1 shadow-xl",
				!shape && "invisible",
			)}
		>
			<div className={cn("relative overflow-hidden rounded-sm", SHAPE_CLASS[shape ?? "square"])}>
				<img
					src={thumbUrl}
					alt=""
					onLoad={(event) =>
						setShape(
							previewShapeOf({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }),
						)
					}
					className="size-full object-cover"
				/>
				{largeUrl && (
					<img
						src={largeUrl}
						alt=""
						onLoad={() => setLargeLoaded(true)}
						className={cn("absolute inset-0 size-full object-cover", !largeLoaded && "opacity-0")}
					/>
				)}
			</div>
		</div>,
		document.body,
	);
};
