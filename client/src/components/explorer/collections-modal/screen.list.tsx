import { useState } from "react";

import {
	LucideAlertTriangle,
	LucideFolderHeart,
	LucideLoader2,
	LucidePencil,
	LucidePlus,
	LucideTrash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections, useDeleteCollection, useUpdateCollection } from "@/lib/query";
import { coverOf } from "~/shared/collections";
import type { Collection, TreeNode } from "~/shared/types";

import { DeleteCollectionDialog, slugHint } from "../collection-dialogs";
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
	const [dialog, setDialog] = useState<"rename" | "delete">();

	const show = (next?: "rename" | "delete") => {
		rename.reset();
		remove.reset();
		setDialog(next);
	};
	const close = () => show();

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
					<p className="truncate text-secondary text-fg-1">
						{collection.slug} · {formatCount(collection.photos.length, "photo", false)}
					</p>
				</div>
			</button>
			<Button
				variant="icon"
				aria-label={`Rename ${collection.name}`}
				onClick={() => show("rename")}
				className="relative z-10"
			>
				<LucidePencil className="size-4" />
			</Button>
			<Button
				variant="icon"
				danger
				aria-label={`Delete ${collection.name}`}
				onClick={() => show("delete")}
				className="relative z-10"
			>
				<LucideTrash2 className="size-4" />
			</Button>
			<PromptDialog
				open={dialog === "rename"}
				onOpenChange={close}
				title="Rename collection"
				label="Name"
				hint={slugHint}
				initialValue={collection.name}
				confirmLabel="Rename"
				pendingLabel="Renaming..."
				pending={rename.isPending}
				error={rename.error ? `Could not rename · ${serverErrorMessage(rename.error)}` : undefined}
				onSubmit={(name) => rename.mutate({ slug: collection.slug, name }, { onSuccess: close })}
			/>
			<DeleteCollectionDialog
				open={dialog === "delete"}
				onOpenChange={close}
				name={collection.name}
				photoCount={collection.photos.length}
				pending={remove.isPending}
				error={remove.error}
				onConfirm={() => remove.mutate(collection.slug, { onSuccess: close })}
			/>
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
						tone="err"
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
