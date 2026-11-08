import {
	LucideAlertTriangle,
	LucideFolderHeart,
	LucideLoader2,
	LucidePencil,
	LucidePlus,
	LucideTrash2,
} from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections, useDeleteCollection, useFileTree, usePresignedUrls, useUpdateCollection } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { Collection, ImageVariant, TreeNode } from "~/shared/types";

import { StateMessage } from "../../ui/state-message";
import { PartialNotice } from "../partial-notice";
import { collectionsInBucket, formatCount, PREVIEW_ORDER, pickPreviewVariant, serverErrorMessage } from "../utils";
import { useCollectionsModal } from "./provider";
import { useBucketSets } from "./use-bucket-sets";

const THUMBNAIL_FIRST: ImageVariant[] = ["thumbnail", ...PREVIEW_ORDER];

export const CollectionThumb = ({
	folder,
	className = "size-16",
}: {
	folder: TreeNode | undefined;
	className?: string;
}) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);

	const variants = childMap.get(folder?.id ?? "") ?? [];
	const variant = pickPreviewVariant(variants, THUMBNAIL_FIRST);
	const { data } = usePresignedUrls(variant ? [variant.id] : [], bucketName, bucketRegion);
	const url = variant && data?.[variant.id];

	return (
		<div className={cn("shrink-0 rounded-md bg-slate-700 overflow-hidden", className)}>
			{url && <img src={url} alt="" className="size-full object-cover" />}
		</div>
	);
};

const CollectionCard = ({ collection, sets }: { collection: Collection; sets: Map<string, TreeNode> }) => {
	const rename = useUpdateCollection();
	const remove = useDeleteCollection();
	const { setScreen } = useCollectionsModal();

	// The cover can sit in another bucket, which has no thumbnail here.
	const shown = sets.has(collection.cover ?? "")
		? collection.cover
		: collection.photos.find((p) => sets.has(p.set))?.set;
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

export const ListScreen = () => {
	const { setScreen } = useCollectionsModal();
	const tree = useBucketSets();
	const collections = useCollections();

	const error = tree.error ?? collections.error;
	const loading = tree.isLoading || collections.isLoading;
	const listed = collectionsInBucket(collections.data?.collections ?? [], tree.sets);

	return (
		<section className="space-y-3" aria-label="Collections">
			<div className="flex justify-end">
				<button
					type="button"
					disabled={loading || !!error}
					onClick={() => setScreen({ screen: "create" })}
					className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-neutral-100 font-medium text-sm rounded-lg"
				>
					<LucidePlus className="size-4" />
					New collection
				</button>
			</div>

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
					<StateMessage
						icon={LucideFolderHeart}
						title="No collections"
						message="None of this bucket's sets are in a collection yet"
					/>
				)}
			</div>
		</section>
	);
};
