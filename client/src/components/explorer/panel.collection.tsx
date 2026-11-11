import { useId, useState } from "react";

import { LucideAlertTriangle, LucideLoader2 } from "lucide-react";

import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Select } from "@/components/ui/select";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections, useCreateCollection, useSetMembers, useUpdatePhoto } from "@/lib/query";
import { holdingSet, setsToMove } from "~/shared/collections";

import { MoveSetsDialog, RemoveFromCollectionDialog } from "./collection-dialogs";
import { InspectorSection } from "./inspector";
import { PhotoTextFields } from "./photo-text-fields";
import { serverErrorMessage } from "./utils";

const NONE = "";
/** A real slug can't hold underscores, so this never collides with one. */
const NEW = "__new__";

type Target = {
	/** Slug of the collection to move the set into, or null to remove it from its collection. */
	into: string | null;
	/** Name of a collection to create for the set; set instead of `into`. */
	newName?: string;
};

export const CollectionSection = ({ setPath }: { setPath: string }) => {
	const { data, isLoading, error } = useCollections();
	const selectId = useId();
	const create = useCreateCollection();
	const setMembers = useSetMembers();
	const updatePhoto = useUpdatePhoto();

	const saved = holdingSet(data, setPath);

	const [naming, setNaming] = useState(false);
	const [target, setTarget] = useState<Target>();

	const moving = target ? setsToMove(data, [setPath], target.newName === undefined ? target.into : null) : [];
	const active = target?.newName === undefined ? setMembers : create;

	const close = () => {
		create.reset();
		setMembers.reset();
		setNaming(false);
		setTarget(undefined);
	};

	const write = ({ into, newName }: Target) =>
		newName === undefined
			? setMembers.mutate({ sets: [setPath], collection: into }, { onSuccess: close })
			: create.mutate({ name: newName, sets: [setPath] }, { onSuccess: close });

	const request = (next: Target) => {
		if (!setsToMove(data, [setPath], next.newName === undefined ? next.into : null).length) return write(next);
		setNaming(false);
		setTarget(next);
	};

	const onCollectionChange = (value: string) => {
		if (value === NEW) setNaming(true);
		else request({ into: value === NONE ? null : value });
	};

	const updatedField =
		updatePhoto.variables && "caption" in updatePhoto.variables ? ("caption" as const) : ("alt" as const);
	const photoResult = updatePhoto.isError
		? { field: updatedField, error: serverErrorMessage(updatePhoto.error) }
		: updatePhoto.isSuccess
			? { field: updatedField }
			: undefined;
	const collectionError = create.error ?? setMembers.error;

	return (
		<InspectorSection title="Collection">
			{isLoading ? (
				<StateMessage size="inline" spin icon={LucideLoader2} title="Loading collections..." />
			) : error ? (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title="Failed to load collections"
					message={serverErrorMessage(error)}
				/>
			) : (
				<div className="space-y-2">
					<div>
						<label htmlFor={selectId} className="mb-1 block text-caption text-fg-2">
							In collection
						</label>
						<Select
							id={selectId}
							value={saved?.collection.slug ?? NONE}
							disabled={create.isPending || setMembers.isPending}
							invalid={!!collectionError}
							onChange={(e) => onCollectionChange(e.target.value)}
						>
							<option value={NONE}>None</option>
							{data?.collections.map(({ slug, name }) => (
								<option key={slug} value={slug}>
									{name}
								</option>
							))}
							<option value={NEW}>New collection…</option>
						</Select>
					</div>
					{collectionError && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title="Could not save"
							message={serverErrorMessage(collectionError)}
						/>
					)}

					<PhotoTextFields
						set={setPath}
						photo={saved?.photo}
						withCaption
						altPlaceholder={saved ? undefined : "Add to a collection to set alt text"}
						result={photoResult}
						onSave={(field, value) => updatePhoto.mutate({ set: setPath, [field]: value })}
					/>
					<p className="text-caption text-fg-2">Saves on blur</p>
				</div>
			)}

			<PromptDialog
				open={naming}
				onOpenChange={(open) => !open && close()}
				title="New collection"
				label="Name"
				confirmLabel="Create"
				pendingLabel="Creating..."
				pending={create.isPending}
				error={create.error ? serverErrorMessage(create.error) : undefined}
				onSubmit={(newName) => request({ into: null, newName })}
			/>
			{target &&
				(target.into === null && target.newName === undefined ? (
					<RemoveFromCollectionDialog
						open
						onOpenChange={close}
						collection={moving[0]?.from.name ?? ""}
						set={setPath}
						pending={active.isPending}
						error={active.error}
						onConfirm={() => write(target)}
					/>
				) : (
					<MoveSetsDialog
						open
						onOpenChange={close}
						moving={moving}
						into={target.newName ?? data?.collections.find((c) => c.slug === target.into)?.name ?? ""}
						pending={active.isPending}
						error={active.error}
						onConfirm={() => write(target)}
					/>
				))}
		</InspectorSection>
	);
};
