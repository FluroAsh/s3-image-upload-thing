import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ApiError } from "@/lib/ofetch";

import { TEXT_DELETED_NOTE } from "./photo-text-fields";
import { serverErrorMessage } from "./utils";

type CollectionDialogProps = {
	/** Whether the dialog is shown. */
	open: boolean;
	/** Called with `false` when the user cancels or presses Escape. */
	onOpenChange: (open: boolean) => void;
	/** Whether the write is running. */
	pending: boolean;
	/** The write's error, kept in the dialog so the user can retry. */
	error: ApiError | null;
	/** Runs the write; the caller closes the dialog when it succeeds. */
	onConfirm: () => void;
};

const Mono = ({ children }: { children: string }) => <span className="font-mono text-fg">{children}</span>;

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
		<Mono>{set}</Mono> leaves the collection. {TEXT_DELETED_NOTE} If it was the last photo, the collection is removed
		too.
	</ConfirmDialog>
);

export const MoveSetsDialog = ({
	moving,
	into,
	error,
	...dialog
}: CollectionDialogProps & {
	/** The sets a write takes out of other collections, with the collection each leaves. */
	moving: { set: string; from: { name: string } }[];
	/** Name of the collection the sets move into. */
	into: string;
}) => (
	<ConfirmDialog
		{...dialog}
		title={
			moving.length === 1 ? "Move 1 set out of its collection?" : `Move ${moving.length} sets out of their collections?`
		}
		confirmLabel="Move"
		pendingLabel="Moving..."
		error={error ? serverErrorMessage(error) : undefined}
	>
		<p>
			A set belongs to one collection. {moving.length === 1 ? "It is" : "These are"} moved into{" "}
			<span className="text-fg">{into}</span>; their alt text and captions come with them.
		</p>
		<ul className="mt-3 space-y-1 rounded-md bg-raised p-2 text-secondary">
			{moving.map(({ set, from }) => (
				<li key={set}>
					<Mono>{set}</Mono> <span className="font-mono text-fg-2">from {from.name}</span>
				</li>
			))}
		</ul>
	</ConfirmDialog>
);
