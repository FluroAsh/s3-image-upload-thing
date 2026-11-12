import { LucideImageOff, LucideStar } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CollectionPhoto } from "~/shared/types";

import { CollectionThumb } from "./collection-thumb";
import { useBucketSets } from "./use-bucket-sets";

const TILE_BADGE = "absolute rounded-sm bg-canvas/80 px-1 font-mono text-caption";

export type DragState = "lifted" | "before" | "after";

type TileProps = {
	/** The collection photo the tile shows. */
	photo: CollectionPhoto;
	/** 1-based position in the collection. */
	position: number;
	/** Whether the photo is the collection's cover. */
	isCover: boolean;
	/** Whether the photo is the one open in the editor. */
	selected: boolean;
	/** `"lifted"` while this tile is dragged; `"before"` or `"after"` marks the edge a drop would land on. */
	drag?: DragState;
	/** Drag event handlers for the tile; the parent owns the drag state. */
	dragProps: React.HTMLAttributes<HTMLDivElement>;
	/** Runs on click, Enter and Space. */
	onSelect: () => void;
	/** Moves the photo one place earlier (-1) or later (1). */
	onMove: (delta: -1 | 1) => void;
};

export const PhotoTile = ({ photo, position, isCover, selected, drag, dragProps, onSelect, onMove }: TileProps) => {
	const { sets } = useBucketSets();
	const folder = sets.get(photo.set);

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onSelect();
		} else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
			e.preventDefault();
			const delta = e.key === "ArrowLeft" ? -1 : 1;
			if (e.altKey) onMove(delta);
			else {
				const sibling = delta < 0 ? e.currentTarget.previousElementSibling : e.currentTarget.nextElementSibling;
				(sibling as HTMLElement | null)?.focus();
			}
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: a <button> can't be dragged in Firefox
		<div
			{...dragProps}
			draggable
			role="button"
			tabIndex={0}
			data-set={photo.set}
			aria-pressed={selected}
			aria-label={photo.set}
			aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
			onClick={onSelect}
			onKeyDown={onKeyDown}
			className={cn(
				"relative size-24 cursor-grab rounded-md ring-2",
				selected ? "ring-accent" : "ring-transparent",
				drag === "lifted" && "opacity-40",
				drag === "before" && "before:absolute before:-left-1.5 before:inset-y-0 before:w-0.5 before:bg-accent",
				drag === "after" && "after:absolute after:-right-1.5 after:inset-y-0 after:w-0.5 after:bg-accent",
			)}
		>
			{folder ? (
				<CollectionThumb folder={folder} className="size-full" />
			) : (
				<div className="grid size-full place-items-center rounded-md border border-dashed border-line-strong p-2 text-center text-caption text-fg-2">
					<LucideImageOff className="size-4" />
					Missing in bucket
				</div>
			)}
			<span className={cn(TILE_BADGE, "right-1 top-1 text-fg-1")}>{position}</span>
			{isCover && (
				<span className={cn(TILE_BADGE, "left-1 top-1 inline-flex items-center gap-1 text-fg")}>
					<LucideStar className="size-3" />
					Cover
				</span>
			)}
			{!photo.alt && (
				<span className={cn(TILE_BADGE, "bottom-1 left-1 inline-flex items-center gap-1 text-fg-1")}>
					<span aria-hidden className="size-1.5 rounded-full bg-warn" />
					No alt
				</span>
			)}
		</div>
	);
};
