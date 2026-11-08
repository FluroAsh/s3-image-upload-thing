import { useEffect, useState } from "react";

import { LucideArrowLeft, LucideImageOff, LucidePlus, LucideStar, LucideTrash2 } from "lucide-react";

import { useCollections, useReorderCollection, useSetMembers, useUpdateCollection, useUpdatePhoto } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { Collection, CollectionPhoto } from "~/shared/types";

import { FIELD_CLASS, serverErrorMessage } from "../utils";
import { coverOf, reorderSets } from "./detail";
import { useCollectionsModal } from "./provider";
import { AddSets } from "./screen.add-sets";
import { CollectionThumb } from "./screen.list";
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
		<div
			{...dragProps}
			draggable
			className={cn(
				"relative size-[120px] cursor-grab rounded-md ring-2",
				selected ? "ring-sky-500" : "ring-transparent",
			)}
		>
			<button
				type="button"
				aria-pressed={selected}
				aria-label={photo.set}
				onClick={onSelect}
				className="absolute inset-0 z-10"
			/>
			{folder ? (
				<CollectionThumb folder={folder} className="size-full" />
			) : (
				<div className="grid size-full place-items-center rounded-md bg-slate-700 p-2 text-center text-xs text-slate-400">
					<LucideImageOff className="size-5" />
					Other bucket
				</div>
			)}
			{isCover && (
				<span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-sky-600 px-1.5 py-0.5 text-xs text-neutral-100">
					<LucideStar className="size-3" />
					Cover
				</span>
			)}
			{!photo.alt && (
				<span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-xs text-slate-900">
					No alt
				</span>
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

	const save = (field: "alt" | "caption", value: string) => {
		if (value !== (photo[field] ?? "")) updatePhoto.mutate({ set: photo.set, [field]: value || null });
	};

	const onRemove = () => {
		if (window.confirm("Remove this photo from the collection? Its alt text and caption are deleted."))
			members.mutate({ sets: [photo.set], collection: null });
	};

	// Keyed on the saved text so a refetch resets what was typed.
	return (
		<div className="space-y-2 rounded-lg border border-slate-600 p-3">
			<p className="truncate text-xs text-slate-400">{photo.set}</p>
			<div className="grid grid-cols-2 gap-2">
				<input
					key={`alt:${photo.set}:${photo.alt ?? ""}`}
					aria-label="Alt text"
					placeholder="Alt text"
					className={FIELD_CLASS}
					defaultValue={photo.alt ?? ""}
					onBlur={(e) => save("alt", e.target.value)}
				/>
				<input
					key={`caption:${photo.set}:${photo.caption ?? ""}`}
					aria-label="Caption"
					placeholder="Caption"
					className={FIELD_CLASS}
					defaultValue={photo.caption ?? ""}
					onBlur={(e) => save("caption", e.target.value)}
				/>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={isCover || update.isPending}
					onClick={() => update.mutate({ slug: collection.slug, cover: photo.set })}
					className="inline-flex items-center gap-2 rounded-md bg-slate-700 px-3 py-1.5 text-sm text-neutral-100 hover:bg-slate-600 disabled:opacity-50"
				>
					<LucideStar className="size-4" />
					{isCover ? "Cover" : "Set as cover"}
				</button>
				<button
					type="button"
					disabled={members.isPending}
					onClick={onRemove}
					className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-red-400 hover:bg-slate-700"
				>
					<LucideTrash2 className="size-4" />
					Remove
				</button>
				{error && <p className="text-xs text-red-500">{serverErrorMessage(error, "Could not save.")}</p>}
			</div>
		</div>
	);
};

export const DetailScreen = ({ slug }: { slug: string }) => {
	const { setScreen } = useCollectionsModal();
	const { data } = useCollections();
	const reorder = useReorderCollection();
	const [selected, setSelected] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	const [dragFrom, setDragFrom] = useState<number | null>(null);

	const collection = data?.collections.find((c) => c.slug === slug);

	// Removing the last photo deletes the collection.
	useEffect(() => {
		if (data && !collection) setScreen({ screen: "list" });
	}, [data, collection, setScreen]);

	if (!collection) return null;

	// Show the dropped order until the refetch lands.
	const order = reorder.isPending ? reorder.variables.sets : collection.photos.map((p) => p.set);
	const byset = new Map(collection.photos.map((p) => [p.set, p]));
	const cover = coverOf(collection);
	const current = byset.get(selected ?? "");

	const onDrop = (to: number) => {
		if (dragFrom !== null && dragFrom !== to) reorder.mutate({ slug, sets: reorderSets(order, dragFrom, to) });
		setDragFrom(null);
	};

	return (
		<section className="space-y-3" aria-label={collection.name}>
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => setScreen({ screen: "list" })}
					className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-neutral-100"
				>
					<LucideArrowLeft className="size-4" />
					Back to collections
				</button>
				{!adding && (
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-neutral-100 font-medium text-sm rounded-lg"
					>
						<LucidePlus className="size-4" />
						Add sets
					</button>
				)}
			</div>
			<h3 className="text-lg font-medium text-neutral-100">{collection.name}</h3>

			{adding ? (
				<AddSets collection={collection} onDone={() => setAdding(false)} />
			) : (
				<>
					{reorder.error && (
						<p className="text-sm text-red-500">{serverErrorMessage(reorder.error, "Could not reorder.")}</p>
					)}
					<div className="max-h-[280px] overflow-y-auto">
						<div className="grid grid-cols-[repeat(auto-fill,120px)] gap-3">
							{order.map((set, i) => {
								const photo = byset.get(set);
								if (!photo) return null;
								return (
									<PhotoTile
										key={set}
										photo={photo}
										isCover={set === cover}
										selected={set === selected}
										onSelect={() => setSelected(set)}
										dragProps={{
											onDragStart: () => setDragFrom(i),
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
						<p className="text-sm text-slate-400">Select a photo to edit it. Drag photos to reorder.</p>
					)}
				</>
			)}
		</section>
	);
};
