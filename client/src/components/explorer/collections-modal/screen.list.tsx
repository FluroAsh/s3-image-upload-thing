import {
	LucideAlertTriangle,
	LucideFolderHeart,
	LucideLoader2,
	LucidePencil,
	LucidePlus,
	LucideTrash2,
} from "lucide-react";

import { useCollections, useDeleteCollection, useUpdateCollection } from "@/lib/query";
import { coverOf } from "~/shared/collections";
import type { Collection, TreeNode } from "~/shared/types";

import { Button } from "../../ui/button";
import { StateMessage } from "../../ui/state-message";
import { PartialNotice } from "../partial-notice";
import { formatCount, serverErrorMessage } from "../utils";
import { CollectionThumb } from "./collection-thumb";
import { useCollectionsModal } from "./provider";
import { useBucketSets } from "./use-bucket-sets";

const CollectionCard = ({ collection, sets }: { collection: Collection; sets: Map<string, TreeNode> }) => {
	const rename = useUpdateCollection();
	const remove = useDeleteCollection();
	const { setScreen } = useCollectionsModal();

	/** A set missing from this bucket has no thumbnail, so the card shows the first one that has. */
	const shown = [coverOf(collection), ...collection.photos.map((p) => p.set)].find((set) => set && sets.has(set));
	const error = rename.error ?? remove.error;

	const onRename = () => {
		const name = window.prompt("Rename collection", collection.name)?.trim();
		if (name && name !== collection.name) rename.mutate({ slug: collection.slug, name });
	};

	const onDelete = () => {
		if (window.confirm(`Delete "${collection.name}"? This removes its photos' alt text and captions.`))
			remove.mutate(collection.slug);
	};

	return (
		/** The open button stretches over the whole row; the actions sit above it. */
		<li className="relative flex cursor-pointer items-center gap-4 rounded-lg border border-line-strong bg-panel p-3 hover:bg-raised">
			<button
				type="button"
				onClick={() => setScreen({ screen: "detail", slug: collection.slug })}
				className="flex min-w-0 flex-1 items-center gap-4 text-left after:absolute after:inset-0"
			>
				<CollectionThumb folder={shown ? sets.get(shown) : undefined} />
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-body font-medium text-fg">{collection.name}</h3>
					<p className="truncate text-xs text-fg-1">
						{collection.slug} · {formatCount(collection.photos.length, "photo", false)}
					</p>
					{error && <p className="text-xs text-err">{serverErrorMessage(error)}</p>}
				</div>
			</button>
			<Button
				variant="icon"
				aria-label={`Rename ${collection.name}`}
				disabled={rename.isPending}
				onClick={onRename}
				className="relative z-10"
			>
				<LucidePencil className="size-4" />
			</Button>
			<Button
				variant="icon"
				danger
				aria-label={`Delete ${collection.name}`}
				disabled={remove.isPending}
				onClick={onDelete}
				className="relative z-10"
			>
				<LucideTrash2 className="size-4" />
			</Button>
		</li>
	);
};

const NewCollectionButton = ({ disabled = false }: { disabled?: boolean }) => {
	const { setScreen } = useCollectionsModal();

	return (
		<Button variant="primary" disabled={disabled} onClick={() => setScreen({ screen: "create" })}>
			<LucidePlus className="size-4" />
			New collection
		</Button>
	);
};

export const ListScreen = () => {
	const tree = useBucketSets();
	const collections = useCollections();

	const error = tree.error ?? collections.error;
	const loading = tree.isLoading || collections.isLoading;
	const listed = collections.data?.collections ?? [];

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
					<StateMessage spin icon={LucideLoader2} title="Loading collections..." />
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
