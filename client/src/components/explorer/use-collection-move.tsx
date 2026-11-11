import { useState } from "react";

import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useCollections, useCreateCollection, useSetMembers } from "@/lib/query";
import { setsToMove } from "~/shared/collections";

import { MoveSetsDialog, RemoveFromCollectionDialog, slugHint } from "./collection-dialogs";
import { serverErrorMessage } from "./utils";

type Target = {
	/** Slug of the collection to move the sets into, or null to remove them from their collection. */
	into: string | null;
	/** Name of a collection to create for the sets; set instead of `into`. */
	newName?: string;
};

/** The two ways a menu or panel puts sets into a collection; both go through the shared confirm and prompt dialogs. */
export type CollectionAssign = {
	/** Moves `sets` into the collection `into`, or out of theirs when null; asks first if that takes them from another collection. */
	toCollection: (sets: string[], into: string | null) => void;
	/** Opens the new-collection prompt for `sets`. */
	toNew: (sets: string[]) => void;
};

/** Owns the add, move, remove and create-collection writes for a set of sets, so the details panel and the tree menu share one flow. */
export const useCollectionMove = () => {
	const { data } = useCollections();
	const create = useCreateCollection();
	const setMembers = useSetMembers();

	const [sets, setSets] = useState<string[]>([]);
	const [naming, setNaming] = useState(false);
	const [target, setTarget] = useState<Target>();

	const moving = target ? setsToMove(data, sets, target.into) : [];
	const active = target?.newName === undefined ? setMembers : create;

	const close = () => {
		create.reset();
		setMembers.reset();
		setNaming(false);
		setTarget(undefined);
	};

	const write = (picked: string[], { into, newName }: Target) =>
		newName === undefined
			? setMembers.mutate({ sets: picked, collection: into }, { onSuccess: close })
			: create.mutate({ name: newName, sets: picked }, { onSuccess: close });

	const request = (picked: string[], next: Target) => {
		setSets(picked);
		if (!setsToMove(data, picked, next.into).length) return write(picked, next);
		setNaming(false);
		setTarget(next);
	};

	const assign: CollectionAssign = {
		toCollection: (picked, into) => request(picked, { into }),
		toNew: (picked) => {
			setSets(picked);
			setNaming(true);
		},
	};

	const dialogs = (
		<>
			<PromptDialog
				open={naming}
				onOpenChange={close}
				title="New collection"
				label="Name"
				hint={slugHint}
				confirmLabel="Create"
				pendingLabel="Creating..."
				pending={create.isPending}
				error={create.error ? serverErrorMessage(create.error) : undefined}
				onSubmit={(newName) => request(sets, { into: null, newName })}
			/>
			{target &&
				(target.into === null && target.newName === undefined ? (
					<RemoveFromCollectionDialog
						open
						onOpenChange={close}
						collection={moving[0]?.from.name ?? ""}
						set={sets[0]}
						pending={active.isPending}
						error={active.error}
						onConfirm={() => write(sets, target)}
					/>
				) : (
					<MoveSetsDialog
						open
						onOpenChange={close}
						moving={moving}
						into={target.newName ?? data?.collections.find((c) => c.slug === target.into)?.name ?? ""}
						pending={active.isPending}
						error={active.error}
						onConfirm={() => write(sets, target)}
					/>
				))}
		</>
	);

	return {
		assign,
		dialogs,
		pending: create.isPending || setMembers.isPending,
		/** The failed write's error while no dialog is open to show it. */
		error: naming || target ? null : (create.error ?? setMembers.error),
	};
};
