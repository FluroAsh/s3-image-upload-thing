import { type ReactNode, useEffect, useRef, useState } from "react";

import { LucideImages } from "lucide-react";

import { useInView } from "@/hooks/useInView";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { ImageVariant, TreeNode } from "~/shared/types";

import { type Point, PREVIEW_ORDER, pickPreviewVariant } from "../utils";
import { HoverPreview } from "./hover-preview";

const THUMBNAIL_FIRST: ImageVariant[] = ["thumbnail", ...PREVIEW_ORDER];

export const SetIcon = ({ className }: { className: string }) => (
	<LucideImages className={cn("shrink-0 text-fg-2", className)} />
);

export const CollectionThumb = ({
	folder,
	className = "size-8",
	thumbnailOnly = false,
	enabled = true,
	fallback,
}: {
	folder: TreeNode | undefined;
	className?: string;
	/** Skips the larger sizes, so a set without a thumbnail shows the fallback instead. */
	thumbnailOnly?: boolean;
	/** False until the image is wanted; no URL is requested before. */
	enabled?: boolean;
	/** Shown instead of an empty square when the set has no such variant or the image fails to load. */
	fallback?: ReactNode;
}) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const [failedUrl, setFailedUrl] = useState<string>();

	const variants = childMap.get(folder?.id ?? "") ?? [];
	const variant = pickPreviewVariant(variants, thumbnailOnly ? ["thumbnail"] : THUMBNAIL_FIRST);
	const { data, isError } = usePresignedUrls(variant && enabled ? [variant.id] : [], bucketName, bucketRegion);
	const url = variant && data?.[variant.id];
	const missing = fallback && (!variant || (url && failedUrl === url) || isError);

	return (
		<div
			data-missing={missing ? "" : undefined}
			className={cn("shrink-0 rounded-md bg-raised overflow-hidden", missing && "grid place-items-center", className)}
		>
			{missing
				? fallback
				: url && (
						<img src={url} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailedUrl(url)} />
					)}
		</div>
	);
};

const HOVER_DELAY_MS = 150;

/** A set row's 20px thumbnail, which asks for its image only once the row has scrolled into the picker, and previews it larger on hover. */
export const RowThumb = ({ folder }: { folder: TreeNode }) => {
	const [ref, seen] = useInView();
	const [open, setOpen] = useState(false);
	const cursor = useRef<Point>({ x: 0, y: 0 });
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const wrapper = useRef<HTMLDivElement | null>(null);

	const hide = () => {
		clearTimeout(timer.current);
		setOpen(false);
	};

	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		window.addEventListener("scroll", close, true);
		window.addEventListener("keydown", close);
		return () => {
			window.removeEventListener("scroll", close, true);
			window.removeEventListener("keydown", close);
		};
	}, [open]);

	useEffect(() => () => clearTimeout(timer.current), []);

	const thumbUrl = wrapper.current?.querySelector("img")?.src;

	return (
		<div
			ref={(el) => {
				ref(el);
				wrapper.current = el;
			}}
			className="shrink-0"
			onPointerEnter={(event) => {
				cursor.current = { x: event.clientX, y: event.clientY };
				timer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
			}}
			onPointerMove={(event) => {
				cursor.current = { x: event.clientX, y: event.clientY };
			}}
			onPointerLeave={hide}
		>
			<CollectionThumb
				folder={folder}
				className="size-5 rounded-sm"
				thumbnailOnly
				enabled={seen}
				fallback={<SetIcon className="size-3.5" />}
			/>
			{open && thumbUrl && <HoverPreview folder={folder} thumbUrl={thumbUrl} start={cursor.current} />}
		</div>
	);
};
