import {
	LucideAlertTriangle,
	LucideFolderHeart,
	LucideLoader2,
	LucidePencil,
	LucidePlus,
	LucideTrash2,
} from "lucide-react";

import { useCollections, useDeleteCollection, useUpdateCollection } from "@/lib/query";
import { cn } from "@/lib/utils";
import { coverOf } from "~/shared/collections";
import type { Collection, TreeNode } from "~/shared/types";

import { StateMessage } from "../../ui/state-message";
import { PartialNotice } from "../partial-notice";
import { collectionsInBucket, formatCount, PRIMARY_BUTTON_CLASS, serverErrorMessage } from "../utils";
import { CollectionThumb } from "./collection-thumb";
import { useCollectionsModal } from "./provider";
import { useBucketSets } from "./use-bucket-sets";

const CollectionCard = ({ collection, sets }: { collection: Collection; sets: Map<string, TreeNode> }) => {
	const rename = useUpdateCollection();
	const remove = useDeleteCollection();
	const { setScreen } = useCollectionsModal();

	// The cover can sit in another bucket, which has no thumbnail here.
	const shown = [coverOf(collection), ...collection.photos.map((p) => p.set)].find((set) => set && sets.has(set));
	const error = rename.error ?? remove.error;

	const onRename = () => {
		const name = window.prompt("Rename collection", collection.name)?.trim();
		if (name && name !== collection.name) rename.mutate({ slug: collection.slug, name });
	};

	const onDelete = () => {
		if (
			window.confirm(
				`Delete "${collection.name}"? This removes its photos' alt text and captions, and any photos from other buckets in it.`,
			)
		)
			remove.mutate(collection.slug);
	};

	return (
		// The open button stretches over the whole row; the actions sit above it.
		<li className="relative flex cursor-pointer items-center gap-4 rounded-lg border border-slate-600 bg-slate-800 p-3 hover:bg-slate-700/60">
			<button
				type="button"
				onClick={() => setScreen({ screen: "detail", slug: collection.slug })}
				className="flex min-w-0 flex-1 items-center gap-4 text-left after:absolute after:inset-0"
			>
				<CollectionThumb folder={shown ? sets.get(shown) : undefined} />
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-sm font-medium text-neutral-100">{collection.name}</h3>
					<p className="truncate text-xs text-slate-400">
						{collection.slug} · {formatCount(collection.photos.length, "photo", false)}
					</p>
					{error && <p className="text-xs text-red-500">{serverErrorMessage(error)}</p>}
				</div>
			</button>
			<button
				type="button"
				aria-label={`Rename ${collection.name}`}
				disabled={rename.isPending}
				onClick={onRename}
				className="relative z-10 p-2 rounded-md text-slate-300 hover:bg-slate-700"
			>
				<LucidePencil className="size-4" />
			</button>
			<button
				type="button"
				aria-label={`Delete ${collection.name}`}
				disabled={remove.isPending}
				onClick={onDelete}
				className="relative z-10 p-2 rounded-md text-red-400 hover:bg-slate-700"
			>
				<LucideTrash2 className="size-4" />
			</button>
		</li>
	);
};

const NewCollectionButton = ({ disabled = false }: { disabled?: boolean }) => {
	const { setScreen } = useCollectionsModal();

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => setScreen({ screen: "create" })}
			className={cn("inline-flex items-center gap-2 px-3 py-1.5", PRIMARY_BUTTON_CLASS)}
		>
			<LucidePlus className="size-4" />
			New collection
		</button>
	);
};

export const ListScreen = () => {
	const tree = useBucketSets();
	const collections = useCollections();

	const error = tree.error ?? collections.error;
	const loading = tree.isLoading || collections.isLoading;
	const listed = collectionsInBucket(collections.data?.collections ?? [], tree.sets);

	return (
		<section className="space-y-3" aria-label="Collections">
			{(loading || error || listed.length > 0) && (
				<div className="flex justify-end">
					<NewCollectionButton disabled={loading || !!error} />
				</div>
			)}

			{tree.data?.partial && <PartialNotice count={tree.data.tree.length} />}

			<div className="max-h-[440px] overflow-y-auto">
				{loading ? (
					<StateMessage tone="info" spin icon={LucideLoader2} title="Loading collections..." />
				) : error ? (
					<StateMessage
						tone="error"
						icon={LucideAlertTriangle}
						title="Failed to load collections"
						message={serverErrorMessage(error)}
					/>
				) : listed.length ? (
					<ul className="space-y-2">
						{listed.map((collection) => (
							<CollectionCard key={collection.slug} collection={collection} sets={tree.sets} />
						))}
					</ul>
				) : (
					<div className="flex flex-col items-center">
						<StateMessage icon={LucideFolderHeart} title="No collections in this bucket yet" />
						<NewCollectionButton />
					</div>
				)}
			</div>
		</section>
	);
};
