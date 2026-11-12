import { useState } from "react";

import { LucidePencil, LucideTrash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useDeleteCollection, useUpdateCollection } from "@/lib/query";
import type { Collection } from "~/shared/types";

import { DeleteCollectionDialog, slugHint } from "../collection-dialogs";
import { serverErrorMessage } from "../utils";

/** Rename and delete for one collection: icon buttons, their dialogs, and the last failure for the caller to show once a dialog is dismissed. */
export const useCollectionActions = (collection: Collection) => {
	const rename = useUpdateCollection();
	const remove = useDeleteCollection();
	const [dialog, setDialog] = useState<"rename" | "delete">();

	const open = (next: "rename" | "delete") => {
		rename.reset();
		remove.reset();
		setDialog(next);
	};
	const close = () => setDialog(undefined);

	const renameError = rename.error && `Could not rename · ${serverErrorMessage(rename.error)}`;
	const failure = remove.error
		? { title: "Could not delete", message: serverErrorMessage(remove.error) }
		: rename.error && { title: "Could not rename", message: serverErrorMessage(rename.error) };

	return {
		error: dialog || !failure ? undefined : failure,
		buttons: (
			<>
				<Button variant="icon" aria-label={`Rename ${collection.name}`} onClick={() => open("rename")}>
					<LucidePencil className="size-3.5" />
				</Button>
				<Button variant="icon" danger aria-label={`Delete ${collection.name}`} onClick={() => open("delete")}>
					<LucideTrash2 className="size-3.5" />
				</Button>
			</>
		),
		dialogs: (
			<>
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
					error={renameError ?? undefined}
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
			</>
		),
	};
};
