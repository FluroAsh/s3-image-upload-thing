import { useEffect, useState } from "react";

import {
	LucideAlertTriangle,
	LucideArrowLeft,
	LucideImageOff,
	LucideLoader2,
	LucidePlus,
	LucideStar,
	LucideTrash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import {
	useCollections,
	useManifest,
	useReorderCollection,
	useSetMembers,
	useUpdateCollection,
	useUpdatePhoto,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import { coverOf } from "~/shared/collections";
import type { Collection, CollectionPhoto } from "~/shared/types";

import { RemoveFromCollectionDialog } from "../collection-dialogs";
import { PhotoTextFields } from "../photo-text-fields";
import { SizeChips } from "../size-chips";
import { serverErrorMessage, summariseSizes } from "../utils";
import { AddSets } from "./add-sets";
import { reorderSets } from "./collection-order";
import { CollectionThumb } from "./collection-thumb";
import { useCollectionsModal } from "./provider";
import { useBucketSets } from "./use-bucket-sets";

const PhotoTile = ({
	photo,
	isCover,
	selected,
	dragProps,
	onSelect,
}: {
	photo: CollectionPhoto;
	isCover: boolean;
	selected: boolean;
	dragProps: React.HTMLAttributes<HTMLDivElement>;
	onSelect: () => void;
}) => {
	const { sets } = useBucketSets();
	const folder = sets.get(photo.set);

	return (
		// biome-ignore lint/a11y/useSemanticElements: a <button> can't be dragged in Firefox
		<div
			{...dragProps}
			draggable
			role="button"
			tabIndex={0}
			aria-pressed={selected}
			aria-label={photo.set}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			className={cn(
				"relative size-[120px] cursor-grab rounded-md ring-2",
				selected ? "ring-accent" : "ring-transparent",
			)}
		>
			{folder ? (
				<CollectionThumb folder={folder} className="size-full" />
			) : (
				<div className="grid size-full place-items-center rounded-md bg-raised p-2 text-center text-secondary text-fg-1">
					<LucideImageOff className="size-5" />
					Missing
				</div>
			)}
			{isCover && (
				<span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm bg-accent px-1.5 py-0.5 text-secondary text-canvas">
					<LucideStar className="size-3" />
					Cover
				</span>
			)}
			{!photo.alt && (
				<span className="absolute bottom-1 left-1 rounded-sm bg-warn px-1.5 py-0.5 text-secondary text-canvas">
					No alt
				</span>
			)}
		</div>
	);
};

const PhotoSizes = ({ set }: { set: string }) => {
	const { data } = useManifest(set);
	const summary = data && summariseSizes(data);

	return (
		<div className="border-t border-line pt-2">
			<p className="mb-1.5 flex justify-between text-caption font-medium uppercase tracking-label text-fg-2">
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
}: {
	collection: Collection;
	photo: CollectionPhoto;
	isCover: boolean;
}) => {
	const updatePhoto = useUpdatePhoto();
	const update = useUpdateCollection();
	const members = useSetMembers();
	const error = updatePhoto.error ?? update.error ?? members.error;

	const [removing, setRemoving] = useState(false);

	const showRemove = (next: boolean) => {
		members.reset();
		setRemoving(next);
	};

	return (
		<div className="space-y-2 rounded-lg border border-line-strong p-3">
			<p className="truncate text-secondary text-fg-1">{photo.set}</p>
			<div className="grid grid-cols-2 gap-2">
				<PhotoTextFields
					set={photo.set}
					photo={photo}
					withCaption
					onSave={(field, value) => updatePhoto.mutate({ set: photo.set, [field]: value })}
				/>
			</div>
			<div className="flex items-center gap-2">
				<Button
					disabled={isCover}
					pending={update.isPending}
					onClick={() => update.mutate({ slug: collection.slug, cover: photo.set })}
				>
					<LucideStar className="size-4" />
					{isCover ? "Cover" : "Set as cover"}
				</Button>
				<Button variant="ghost" danger onClick={() => showRemove(true)}>
					<LucideTrash2 className="size-4" />
					Remove
				</Button>
			</div>
			{error && !(removing && error === members.error) && (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title="Could not save"
					message={serverErrorMessage(error)}
				/>
			)}
			<PhotoSizes set={photo.set} />
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

export const DetailScreen = ({ slug }: { slug: string }) => {
	const { setScreen } = useCollectionsModal();
	const { data, error } = useCollections();
	const reorder = useReorderCollection();
	const [selected, setSelected] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	const [dragFrom, setDragFrom] = useState<number | null>(null);

	const collection = data?.collections.find((c) => c.slug === slug);

	/** Removing the last photo deletes the collection. */
	useEffect(() => {
		if (data && !collection) setScreen({ screen: "list" });
	}, [data, collection, setScreen]);

	if (!collection)
		return error ? (
			<StateMessage
				tone="err"
				icon={LucideAlertTriangle}
				title="Failed to load collection"
				message={serverErrorMessage(error)}
			/>
		) : (
			<StateMessage spin icon={LucideLoader2} title="Loading collection..." />
		);

	/** Show the dropped order until the refetch lands. */
	const order = reorder.isPending ? reorder.variables.sets : collection.photos.map((p) => p.set);
	const bySet = new Map(collection.photos.map((p) => [p.set, p]));
	const cover = coverOf(collection);
	const current = bySet.get(selected ?? "");

	const onDrop = (to: number) => {
		if (dragFrom !== null && dragFrom !== to) reorder.mutate({ slug, sets: reorderSets(order, dragFrom, to) });
		setDragFrom(null);
	};

	return (
		<section className="space-y-3" aria-label={collection.name}>
			<div className="flex items-center justify-between">
				<Button variant="ghost" onClick={() => setScreen({ screen: "list" })}>
					<LucideArrowLeft className="size-4" />
					Back to collections
				</Button>
				{!adding && (
					<Button variant="primary" onClick={() => setAdding(true)}>
						<LucidePlus className="size-4" />
						Add sets
					</Button>
				)}
			</div>
			<h3 className="text-lg font-medium text-fg">{collection.name}</h3>

			{adding ? (
				<AddSets collection={collection} onDone={() => setAdding(false)} />
			) : (
				<>
					{reorder.error && (
						<p className="text-body text-err">{serverErrorMessage(reorder.error, "Could not reorder.")}</p>
					)}
					<div className="max-h-[280px] overflow-y-auto">
						<div className="grid grid-cols-[repeat(auto-fill,120px)] gap-3">
							{order.map((set, i) => {
								return (
									<PhotoTile
										key={set}
										photo={bySet.get(set) as CollectionPhoto}
										isCover={set === cover}
										selected={set === selected}
										onSelect={() => setSelected(set)}
										dragProps={{
											onDragStart: (e) => {
												e.dataTransfer.setData("text/plain", set);
												e.dataTransfer.effectAllowed = "move";
												setDragFrom(i);
											},
											onDragEnd: () => setDragFrom(null),
											onDragOver: (e) => e.preventDefault(),
											onDrop: () => onDrop(i),
										}}
									/>
								);
							})}
						</div>
					</div>
					{current ? (
						<PhotoEditor collection={collection} photo={current} isCover={current.set === cover} />
					) : (
						<p className="text-body text-fg-1">Select a photo to edit it. Drag photos to reorder.</p>
					)}
				</>
			)}
		</section>
	);
};
