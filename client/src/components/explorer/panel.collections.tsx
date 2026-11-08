import {
	LucideAlertTriangle,
	LucideArrowLeft,
	LucideFolderHeart,
	LucideLoader2,
	LucidePencil,
	LucideTrash2,
} from "lucide-react";
import { useQueryState } from "nuqs";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections, useDeleteCollection, useFileTree, usePresignedUrls, useRenameCollection } from "@/lib/query";
import { dashboardSearchParams } from "@/lib/search-params";
import type { Collection, TreeNode } from "~/shared/types";

import { ScrollArea } from "../ui/scroll-area";
import { StateMessage } from "../ui/state-message";
import { CreateCollection } from "./panel.collections.create";
import { useBucketSets } from "./use-bucket-sets";
import { collectionsInBucket, formatCount, pickPreviewVariant, serverErrorMessage } from "./utils";

const FALLBACK = "Something went wrong. Try again shortly.";

const CollectionThumb = ({ folder }: { folder: TreeNode | undefined }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);

	const variants = childMap.get(folder?.id ?? "") ?? [];
	const variant = variants.find((v) => v.name.startsWith("thumbnail_")) ?? pickPreviewVariant(variants);
	const { data } = usePresignedUrls(variant ? [variant.id] : [], bucketName, bucketRegion);
	const url = variant && data?.[variant.id];

	return (
		<div className="size-16 shrink-0 rounded-md bg-slate-700 overflow-hidden">
			{url && <img src={url} alt="" className="size-full object-cover" />}
		</div>
	);
};

const CollectionCard = ({ collection, sets }: { collection: Collection; sets: Map<string, TreeNode> }) => {
	const rename = useRenameCollection();
	const remove = useDeleteCollection();

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
		<li className="flex items-center gap-4 rounded-lg border border-slate-600 bg-slate-800 p-3">
			<CollectionThumb folder={shown ? sets.get(shown) : undefined} />
			<div className="min-w-0 flex-1">
				<h3 className="truncate text-sm font-medium text-neutral-100">{collection.name}</h3>
				<p className="truncate text-xs text-slate-400">
					{collection.slug} · {formatCount(collection.photos.length, "photo", false)}
				</p>
				{error && <p className="text-xs text-red-500">{serverErrorMessage(error, FALLBACK)}</p>}
			</div>
			<button
				type="button"
				aria-label={`Rename ${collection.name}`}
				disabled={rename.isPending}
				onClick={onRename}
				className="p-2 rounded-md text-slate-300 hover:bg-slate-700"
			>
				<LucidePencil className="size-4" />
			</button>
			<button
				type="button"
				aria-label={`Delete ${collection.name}`}
				disabled={remove.isPending}
				onClick={onDelete}
				className="p-2 rounded-md text-red-400 hover:bg-slate-700"
			>
				<LucideTrash2 className="size-4" />
			</button>
		</li>
	);
};

export const CollectionsView = () => {
	const { bucketName } = useExplorer().state;
	const [, setShowCollections] = useQueryState("collections", dashboardSearchParams.collections);
	const tree = useBucketSets();
	const collections = useCollections();

	const error = tree.error ?? collections.error;
	const loading = tree.isLoading || collections.isLoading;
	const listed = collectionsInBucket(collections.data?.collections ?? [], tree.sets);

	return (
		<section className="flex flex-1 flex-col bg-slate-900" aria-label="Collections">
			<div className="flex items-center gap-3 border-b border-slate-700 bg-slate-800 p-4">
				<button
					type="button"
					onClick={() => setShowCollections(false)}
					className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-neutral-100"
				>
					<LucideArrowLeft className="size-4" />
					Back to files
				</button>
				<h2 className="text-sm font-semibold text-neutral-100">Collections in {bucketName}</h2>
				<div className="ml-auto">{!loading && !error && <CreateCollection />}</div>
			</div>

			<ScrollArea>
				{loading ? (
					<StateMessage tone="info" spin icon={LucideLoader2} title="Loading collections..." />
				) : error ? (
					<StateMessage
						tone="error"
						icon={LucideAlertTriangle}
						title="Failed to load collections"
						message={serverErrorMessage(error, FALLBACK)}
					/>
				) : listed.length ? (
					<ul className="space-y-2 p-4">
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
			</ScrollArea>
		</section>
	);
};
