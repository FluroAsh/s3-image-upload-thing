import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog";
import type { ApiError } from "@/lib/ofetch";
import { slugOf } from "~/shared/collections";
import type { Collection } from "~/shared/types";

import { TEXT_DELETED_NOTE } from "./photo-text-fields";
import { serverErrorMessage } from "./utils";

type CollectionDialogProps = Pick<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm"> & {
	/** Whether the write is running. */
	pending: boolean;
	/** The write's error, kept in the dialog so the user can retry. */
	error: ApiError | null;
};

/** Previews the id the server gives a collection with this name. */
export const slugHint = (name: string) => (slugOf(name) ? `Slug: ${slugOf(name)}` : "");

const MONO = "font-mono text-fg";

/** Collections that lose every photo to the move, so the server deletes them. */
const emptiedBy = (moving: { from: Collection }[]) => {
	const taken = new Map<string, { collection: Collection; count: number }>();
	for (const { from } of moving)
		taken.set(from.slug, { collection: from, count: (taken.get(from.slug)?.count ?? 0) + 1 });
	return [...taken.values()]
		.filter(({ collection, count }) => count === collection.photos.length)
		.map((e) => e.collection.name);
};

export const DeleteCollectionDialog = ({
	name,
	photoCount,
	error,
	...dialog
}: CollectionDialogProps & { name: string; photoCount: number }) => (
	<ConfirmDialog
		{...dialog}
		title="Delete collection?"
		confirmLabel="Delete"
		pendingLabel="Deleting..."
		error={error ? serverErrorMessage(error) : undefined}
		destructive
	>
		<span className="text-fg">{name}</span> · {photoCount} {photoCount === 1 ? "photo" : "photos"}. Its photos' alt text
		and captions are deleted. The images stay in the bucket.
	</ConfirmDialog>
);

export const RemoveFromCollectionDialog = ({
	collection,
	set,
	error,
	...dialog
}: CollectionDialogProps & { collection: string; set: string }) => (
	<ConfirmDialog
		{...dialog}
		title={`Remove from ${collection}?`}
		confirmLabel="Remove"
		pendingLabel="Removing..."
		error={error ? serverErrorMessage(error) : undefined}
		destructive
	>
		<span className={MONO}>{set}</span> leaves the collection. {TEXT_DELETED_NOTE} If it was the last photo, the
		collection is removed too.
	</ConfirmDialog>
);

export const MoveSetsDialog = ({
	moving,
	into,
	error,
	...dialog
}: CollectionDialogProps & {
	/** The sets a write takes out of other collections, with the collection each leaves. */
	moving: { set: string; from: Collection }[];
	/** Name of the collection the sets move into. */
	into: string;
}) => {
	const emptied = emptiedBy(moving);

	return (
		<ConfirmDialog
			{...dialog}
			title={
				moving.length === 1
					? "Move 1 set out of its collection?"
					: `Move ${moving.length} sets out of their collections?`
			}
			confirmLabel="Move"
			pendingLabel="Moving..."
			error={error ? serverErrorMessage(error) : undefined}
		>
			<p>
				A set belongs to one collection. {moving.length === 1 ? "It is" : "These are"} moved into{" "}
				<span className="text-fg">{into}</span>; {moving.length === 1 ? "its" : "their"} alt text and captions come with{" "}
				{moving.length === 1 ? "it" : "them"}.
			</p>
			<ul className="mt-3 space-y-1 rounded-md bg-raised p-2 text-secondary">
				{moving.map(({ set, from }) => (
					<li key={set}>
						<span className={MONO}>{set}</span> <span className="font-mono text-fg-2">from {from.name}</span>
					</li>
				))}
			</ul>
			{emptied.length > 0 && (
				<p className="mt-3">
					<span className="text-fg">{emptied.join(", ")}</span> will be removed because{" "}
					{emptied.length === 1 ? "it" : "they"} will be empty.
				</p>
			)}
		</ConfirmDialog>
	);
};
