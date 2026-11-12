import { useEffect, useRef, useState } from "react";

import { LucideAlertTriangle, LucideImageOff, LucidePlus, LucideStar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { StateMessage } from "@/components/ui/state-message";
import { useManifest, useReorderCollection, useSetMembers, useUpdateCollection, useUpdatePhoto } from "@/lib/query";
import { cn } from "@/lib/utils";
import { coverOf } from "~/shared/collections";
import type { Collection, CollectionPhoto } from "~/shared/types";

import { RemoveFromCollectionDialog } from "../collection-dialogs";
import { PhotoTextFields, photoSaveResult } from "../photo-text-fields";
import { SizeChips } from "../size-chips";
import { serverErrorMessage, summariseSizes } from "../utils";
import { reorderSets } from "./collection-order";
import { CollectionThumb } from "./collection-thumb";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";
import { useBucketSets } from "./use-bucket-sets";
import { useCollectionActions } from "./use-collection-actions";
import { WithCollection } from "./with-collection";

const LABEL = "text-caption font-medium uppercase tracking-label text-fg-2";
const TILE_BADGE = "absolute rounded-sm bg-canvas/80 px-1 font-mono text-caption";

type TileProps = {
	photo: CollectionPhoto;
	/** 1-based position in the collection. */
	position: number;
	isCover: boolean;
	selected: boolean;
	/** `"lifted"` while this tile is dragged; `"before"` or `"after"` marks the edge a drop would land on. */
	drag?: "lifted" | "before" | "after";
	dragProps: React.HTMLAttributes<HTMLDivElement>;
	onSelect: () => void;
	/** Moves the photo one place earlier (-1) or later (1). */
	onMove: (delta: -1 | 1) => void;
};

const PhotoTile = ({ photo, position, isCover, selected, drag, dragProps, onSelect, onMove }: TileProps) => {
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
			{!photo.alt && <span className={cn(TILE_BADGE, "bottom-1 left-1 text-warn")}>No alt</span>}
		</div>
	);
};

const PhotoSizes = ({ set }: { set: string }) => {
	const { data } = useManifest(set);
	const summary = data && summariseSizes(data);

	return (
		<div className="border-t border-line pt-2">
			<p className={cn(LABEL, "mb-1.5 flex justify-between")}>
				Sizes
				{summary && (
					<span className="font-mono">
						{summary.statuses.length - summary.missing} of {summary.statuses.length}
					</span>
				)}
			</p>
			<SizeChips set={set} />
			{!!summary?.missing && (
				<p className="mt-2 text-caption text-fg-2">Open the set in the explorer to generate missing sizes.</p>
			)}
		</div>
	);
};

const PhotoEditor = ({
	collection,
	photo,
	isCover,
	missing,
}: {
	collection: Collection;
	photo: CollectionPhoto;
	isCover: boolean;
	/** The set is not in the bucket listing, so it has no sizes and cannot be the cover. */
	missing: boolean;
}) => {
	const updatePhoto = useUpdatePhoto();
	const update = useUpdateCollection();
	const members = useSetMembers();
	const [removing, setRemoving] = useState(false);

	const showRemove = (next: boolean) => {
		if (next) members.reset();
		setRemoving(next);
	};

	const failure = update.error
		? { title: "Could not set cover", error: update.error }
		: members.error && !removing
			? { title: "Could not remove", error: members.error }
			: undefined;

	return (
		<div className="space-y-3">
			<div>
				<p className={LABEL}>Selected</p>
				<p className="mt-1 break-all font-mono text-body text-fg">{photo.set}</p>
			</div>
			{missing && (
				<StateMessage
					size="inline"
					icon={LucideImageOff}
					title="Not in the bucket"
					message="The set was deleted or renamed; its text is kept until you remove it."
				/>
			)}
			<div className="space-y-2">
				<PhotoTextFields
					set={photo.set}
					photo={photo}
					withCaption
					result={photoSaveResult(updatePhoto)}
					onSave={(field, value) => updatePhoto.mutate({ set: photo.set, [field]: value })}
				/>
			</div>
			<div className="flex items-center gap-2">
				<Button
					disabled={isCover || missing}
					pending={update.isPending}
					onClick={() => update.mutate({ slug: collection.slug, cover: photo.set })}
				>
					<LucideStar className="size-3.5" />
					{isCover ? "Cover" : "Set as cover"}
				</Button>
				<Button variant="ghost" danger onClick={() => showRemove(true)}>
					Remove
				</Button>
			</div>
			{failure && (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title={failure.title}
					message={serverErrorMessage(failure.error)}
				/>
			)}
			{!missing && <PhotoSizes set={photo.set} />}
			<RemoveFromCollectionDialog
				open={removing}
				onOpenChange={showRemove}
				collection={collection.name}
				set={photo.set}
				pending={members.isPending}
				error={members.error}
				onConfirm={() =>
					members.mutate({ sets: [photo.set], collection: null }, { onSuccess: () => showRemove(false) })
				}
			/>
		</div>
	);
};

const CollectionDetail = ({ collection }: { collection: Collection }) => {
	const { setScreen } = useCollectionsModal();
	const { sets } = useBucketSets();
	const actions = useCollectionActions(collection);
	const reorder = useReorderCollection();
	const [selected, setSelected] = useState<string | null>(null);
	const [dragFrom, setDragFrom] = useState<number | null>(null);
	const [dropAt, setDropAt] = useState<number | null>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const focusAfter = useRef<string | null>(null);

	/** A moved tile is remounted by the reorder, so focus is put back once the new order renders. */
	useEffect(() => {
		if (focusAfter.current === null) return;
		gridRef.current?.querySelector<HTMLElement>(`[data-set="${CSS.escape(focusAfter.current)}"]`)?.focus();
		focusAfter.current = null;
	});

	/** Show the dropped order until the refetch lands. */
	const order = reorder.isPending ? reorder.variables.sets : collection.photos.map((p) => p.set);
	const bySet = new Map(collection.photos.map((p) => [p.set, p]));
	const cover = coverOf(collection);
	const current = bySet.get(selected ?? "");

	const move = (from: number, to: number) => {
		if (from === to || to < 0 || to >= order.length) return;
		focusAfter.current = order[from];
		reorder.mutate({ slug: collection.slug, sets: reorderSets(order, from, to) });
	};

	const endDrag = () => {
		setDragFrom(null);
		setDropAt(null);
	};

	return (
		<>
			<ScreenHeader
				title={collection.name}
				subtitle={`${collection.slug} · ${collection.photos.length}`}
				onBack={() => setScreen({ screen: "list" })}
				backLabel="Back to collections"
			>
				{actions.buttons}
				<Button variant="primary" onClick={() => setScreen({ screen: "add", slug: collection.slug })}>
					<LucidePlus className="size-3.5" />
					Add sets
				</Button>
			</ScreenHeader>

			<DialogBody className="flex min-h-[380px] p-0">
				<section aria-label="Photos" className="min-w-0 flex-1 space-y-3 p-4">
					<p className={cn(LABEL, "flex justify-between")}>
						<span>Photos · drag to reorder</span>
						<span>Cover = first unless set</span>
					</p>
					{actions.error && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title="Could not finish"
							message={actions.error}
						/>
					)}
					{reorder.error && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title="Could not reorder"
							message={`${serverErrorMessage(reorder.error)} The order shown is the saved one.`}
						/>
					)}
					<div ref={gridRef} className="grid grid-cols-[repeat(auto-fill,96px)] gap-2">
						{order.map((set, i) => (
							<PhotoTile
								key={set}
								photo={bySet.get(set) as CollectionPhoto}
								position={i + 1}
								isCover={set === cover}
								selected={set === selected}
								drag={
									dragFrom === i
										? "lifted"
										: dragFrom !== null && dropAt === i
											? dragFrom < i
												? "after"
												: "before"
											: undefined
								}
								onSelect={() => setSelected(set)}
								onMove={(delta) => move(i, i + delta)}
								dragProps={{
									onDragStart: (e) => {
										e.dataTransfer.setData("text/plain", set);
										e.dataTransfer.effectAllowed = "move";
										setDragFrom(i);
									},
									onDragEnd: endDrag,
									onDragOver: (e) => {
										e.preventDefault();
										setDropAt(i);
									},
									onDrop: () => {
										if (dragFrom !== null) move(dragFrom, i);
										endDrag();
									},
								}}
							/>
						))}
					</div>
					{!current && (
						<p className="text-center text-body text-fg-1">
							Select a photo to edit its alt text and caption. Drag to reorder.
						</p>
					)}
				</section>
				{current && (
					<aside aria-label="Selected photo" className="w-[280px] shrink-0 border-l border-line p-4">
						<PhotoEditor
							key={current.set}
							collection={collection}
							photo={current}
							isCover={current.set === cover}
							missing={!sets.has(current.set)}
						/>
					</aside>
				)}
			</DialogBody>

			<ScreenFooter
				info={
					<span className="inline-flex items-center gap-1">
						Changes save on blur · drag, or <Kbd>⌥</Kbd>
						<Kbd>←</Kbd>
						<Kbd>→</Kbd> to reorder
					</span>
				}
			>
				<DialogClose asChild>
					<Button>Close</Button>
				</DialogClose>
			</ScreenFooter>
			{actions.dialogs}
		</>
	);
};

export const DetailScreen = ({ slug }: { slug: string }) => (
	<WithCollection slug={slug}>{(collection) => <CollectionDetail collection={collection} />}</WithCollection>
);
