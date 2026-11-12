import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import type { TreeNode } from "~/shared/types";

import { type Point, pickPreviewVariant, placeBesideCursor } from "../utils";

/** Smallest adequate size first; `full` is a far bigger download. */
export const HOVER_ORDER = ["small", "medium", "large", "full", "thumbnail"] as const;

const MAX_SIDE = 240;

/** Boxed larger image that follows the cursor; the caller mounts it only after the hover delay and unmounts it to hide. */
export const HoverPreview = ({
	folder,
	thumbUrl,
	start,
}: {
	folder: TreeNode;
	/** Row thumbnail shown scaled up until the larger image arrives. */
	thumbUrl: string | undefined;
	start: Point;
}) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const boxRef = useRef<HTMLDivElement>(null);
	const cursor = useRef(start);

	const variant = pickPreviewVariant(childMap.get(folder.id) ?? [], [...HOVER_ORDER]);
	const { data } = usePresignedUrls(variant ? [variant.id] : [], bucketName, bucketRegion);
	const largeUrl = variant && data?.[variant.id];
	const url = largeUrl || thumbUrl;

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

	useLayoutEffect(place);

	useEffect(() => {
		const move = (event: PointerEvent) => {
			cursor.current = { x: event.clientX, y: event.clientY };
			place();
		};
		window.addEventListener("pointermove", move);
		return () => window.removeEventListener("pointermove", move);
	});

	if (!url) return null;

	return createPortal(
		<div
			ref={boxRef}
			className="pointer-events-none fixed left-0 top-0 z-[100] rounded-md border border-line bg-raised p-1 shadow-xl"
		>
			<img
				src={url}
				alt=""
				onLoad={place}
				style={largeUrl ? { maxWidth: MAX_SIDE, maxHeight: MAX_SIDE } : { width: MAX_SIDE, height: MAX_SIDE }}
				className="block rounded-sm object-contain"
			/>
		</div>,
		document.body,
	);
};
