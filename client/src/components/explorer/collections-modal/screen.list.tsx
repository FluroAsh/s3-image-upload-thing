import { LucideAlertTriangle, LucideFolderHeart, LucideLoader2, LucidePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose } from "@/components/ui/dialog";
import { StateMessage } from "@/components/ui/state-message";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections } from "@/lib/query";
import { coverOf } from "~/shared/collections";
import type { Collection, TreeNode } from "~/shared/types";

import { PartialNotice } from "../partial-notice";
import { formatCount, serverErrorMessage } from "../utils";
import { CollectionThumb } from "./collection-thumb";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";
import { useBucketSets } from "./use-bucket-sets";
import { useCollectionActions } from "./use-collection-actions";

const CollectionRow = ({ collection, sets }: { collection: Collection; sets: Map<string, TreeNode> }) => {
	const { setScreen } = useCollectionsModal();
	const actions = useCollectionActions(collection);

	/** A set missing from this bucket has no thumbnail, so the row shows the first one that has. */
	const shown = [coverOf(collection), ...collection.photos.map((p) => p.set)].find((set) => set && sets.has(set));
	const noAlt = collection.photos.filter((photo) => !photo.alt).length;

	return (
		/** The open button stretches over the whole row; the actions sit above it. */
		<li className="relative flex min-h-11 flex-wrap items-center gap-x-3 rounded-md px-2 py-1 hover:bg-raised">
			<button
				type="button"
				onClick={() => setScreen({ screen: "detail", slug: collection.slug })}
				className="flex min-w-0 flex-1 items-center gap-3 text-left after:absolute after:inset-0"
			>
				<CollectionThumb folder={shown ? sets.get(shown) : undefined} />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-body font-medium text-fg">{collection.name}</span>
					<span className="block truncate font-mono text-caption text-fg-2">
						{collection.slug} · {formatCount(collection.photos.length, "photo", false)}
					</span>
				</span>
			</button>
			{actions.error && (
				<span className="order-last basis-full pb-1 pl-11 text-caption text-err">
					{actions.error.title} · {actions.error.message}
				</span>
			)}
			{noAlt > 0 && <Badge tone="warn">{noAlt} no alt</Badge>}
			<span className="relative z-10 flex">{actions.buttons}</span>
			{actions.dialogs}
		</li>
	);
};

const NewCollectionButton = ({ disabled = false }: { disabled?: boolean }) => {
	const { setScreen } = useCollectionsModal();

	return (
		<Button variant="primary" disabled={disabled} onClick={() => setScreen({ screen: "create" })}>
			<LucidePlus className="size-3.5" />
			New collection
		</Button>
	);
};

export const ListScreen = () => {
	const { bucketName } = useExplorer().state;
	const tree = useBucketSets();
	const collections = useCollections();

	const error = tree.error ?? collections.error;
	const loading = tree.isLoading || collections.isLoading;
	const listed = collections.data?.collections ?? [];
	const photoCount = listed.reduce((sum, collection) => sum + collection.photos.length, 0);

	const retry = () => {
		if (tree.error) tree.refetch();
		if (collections.error) collections.refetch();
	};

	return (
		<>
			<ScreenHeader title="Collections" subtitle={listed.length ? `${bucketName} · ${listed.length}` : undefined}>
				{(loading || error || listed.length > 0) && <NewCollectionButton disabled={loading || !!error} />}
			</ScreenHeader>

			<DialogBody className="min-h-[240px] space-y-2 p-2">
				{tree.data?.partial && <PartialNotice count={tree.data.tree.length} />}

				{loading ? (
					<StateMessage spin icon={LucideLoader2} title="Loading collections..." />
				) : error ? (
					<div className="flex flex-col items-center">
						<StateMessage
							tone="err"
							icon={LucideAlertTriangle}
							title="Failed to load collections"
							message={serverErrorMessage(error)}
						/>
						<Button onClick={retry}>Retry</Button>
					</div>
				) : listed.length ? (
					<ul>
						{listed.map((collection) => (
							<CollectionRow key={collection.slug} collection={collection} sets={tree.sets} />
						))}
					</ul>
				) : (
					<div className="flex flex-col items-center">
						<StateMessage
							icon={LucideFolderHeart}
							title="No collections yet"
							message="A collection groups sets for the gallery, with alt text and captions."
						/>
						<NewCollectionButton />
					</div>
				)}
			</DialogBody>

			<ScreenFooter
				info={
					listed.length > 0 &&
					`${formatCount(photoCount, "photo", false)} in ${formatCount(listed.length, "collection", false)}`
				}
			>
				<DialogClose asChild>
					<Button>Close</Button>
				</DialogClose>
			</ScreenFooter>
		</>
	);
};
