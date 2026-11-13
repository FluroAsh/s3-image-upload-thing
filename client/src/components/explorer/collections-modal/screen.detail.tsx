import { useEffect, useRef, useState } from "react";

import { LucideAlertTriangle, LucidePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SECTION_LABEL } from "@/components/ui/section-label";
import { StateMessage } from "@/components/ui/state-message";
import { useReorderCollection } from "@/lib/query";
import { cn } from "@/lib/utils";
import { coverOf } from "~/shared/collections";
import type { Collection, CollectionPhoto } from "~/shared/types";

import { formatCount, serverErrorMessage } from "../utils";
import { reorderSets } from "./collection-order";
import { PhotoEditor } from "./photo-editor";
import { type DragState, PhotoTile } from "./photo-tile";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";
import { useBucketSets } from "./use-bucket-sets";
import { useCollectionActions } from "./use-collection-actions";
import { WithCollection } from "./with-collection";

const dragStateOf = (index: number, dragFrom: number | null, dropAt: number | null): DragState | undefined => {
	if (dragFrom === index) return "lifted";
	if (dragFrom === null || dropAt !== index) return undefined;
	return dragFrom < index ? "after" : "before";
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

	const focusTile = (set: string) =>
		gridRef.current?.querySelector<HTMLElement>(`[data-set="${CSS.escape(set)}"]`)?.focus();

	/** A moved tile is remounted by the reorder, so focus is put back once the new order renders. */
	useEffect(() => {
		if (focusAfter.current === null) return;
		focusTile(focusAfter.current);
		document.activeElement?.scrollIntoView({ block: "nearest" });
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
				subtitle={`${collection.slug} · ${formatCount(collection.photos.length, "photo", false)}`}
				onBack={() => setScreen({ screen: "list" })}
				backLabel="Back to collections"
			>
				{actions.buttons}
				<Button variant="primary" onClick={() => setScreen({ screen: "add", slug: collection.slug })}>
					<LucidePlus className="size-3.5" />
					Add sets
				</Button>
			</ScreenHeader>

			<DialogBody className="flex min-h-[380px] overflow-hidden p-0">
				<section aria-label="Photos" className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-4">
					<p className={cn(SECTION_LABEL, "flex justify-between")}>
						<span>Photos · drag to reorder</span>
						<span>Cover = first unless set</span>
					</p>
					{actions.error && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title={actions.error.title}
							message={actions.error.message}
						/>
					)}
					{reorder.error && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title="Could not reorder"
							message={`${serverErrorMessage(reorder.error)} · The order shown is the saved one.`}
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
								drag={dragStateOf(i, dragFrom, dropAt)}
								onSelect={() => {
									reorder.reset();
									setSelected(set);
								}}
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
					<aside
						aria-label="Selected photo"
						className="min-h-0 w-[280px] shrink-0 overflow-y-auto border-l border-line p-4"
					>
						<PhotoEditor
							key={current.set}
							collection={collection}
							photo={current}
							isCover={current.set === cover}
							missing={!sets.has(current.set)}
							onCoverSet={() => {
								reorder.reset();
								focusTile(current.set);
							}}
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
