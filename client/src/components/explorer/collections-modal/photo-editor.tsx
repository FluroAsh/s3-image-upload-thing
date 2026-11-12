import { useState } from "react";

import { LucideAlertTriangle, LucideImageOff, LucideStar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SECTION_LABEL } from "@/components/ui/section-label";
import { StateMessage } from "@/components/ui/state-message";
import { useManifest, useSetMembers, useUpdateCollection, useUpdatePhoto } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { Collection, CollectionPhoto } from "~/shared/types";

import { RemoveFromCollectionDialog } from "../collection-dialogs";
import { PhotoTextFields, photoSaveResult } from "../photo-text-fields";
import { SizeChips } from "../size-chips";
import { serverErrorMessage, summariseSizes } from "../utils";

const PhotoSizes = ({ set }: { set: string }) => {
	const { data } = useManifest(set);
	const summary = data && summariseSizes(data);

	return (
		<div className="border-t border-line pt-2">
			<p className={cn(SECTION_LABEL, "mb-1.5 flex justify-between")}>
				Sizes
				{summary && (
					<span className="font-mono">
						{summary.statuses.length - summary.missing} of {summary.statuses.length}
					</span>
				)}
			</p>
			<SizeChips set={set} />
			{!!summary?.missing && (
				<p className="mt-2 text-caption text-fg-2">Open the set in the explorer to generate missing sizes.</p>
			)}
		</div>
	);
};

type PhotoEditorProps = {
	/** The collection the photo belongs to. */
	collection: Collection;
	/** The photo being edited. */
	photo: CollectionPhoto;
	/** Whether the photo is the collection's cover. */
	isCover: boolean;
	/** The set is not in the bucket listing, so it has no sizes and cannot be the cover. */
	missing: boolean;
	/** Called after "Set as cover" succeeds, so focus can move off the now-disabled button. */
	onCoverSet: () => void;
};

export const PhotoEditor = ({ collection, photo, isCover, missing, onCoverSet }: PhotoEditorProps) => {
	const updatePhoto = useUpdatePhoto();
	const update = useUpdateCollection();
	const members = useSetMembers();
	const [removing, setRemoving] = useState(false);

	const showRemove = (next: boolean) => {
		if (next) members.reset();
		setRemoving(next);
	};

	const failure = update.error
		? { title: "Could not set cover", error: update.error }
		: members.error && !removing
			? { title: "Could not remove", error: members.error }
			: undefined;

	return (
		<div className="space-y-3">
			<div>
				<p className={SECTION_LABEL}>Selected</p>
				<p className="mt-1 break-all font-mono text-body text-fg">{photo.set}</p>
			</div>
			{missing && (
				<StateMessage
					size="inline"
					icon={LucideImageOff}
					title="Not in the bucket"
					message="The set was deleted or renamed; its text is kept until you remove it."
				/>
			)}
			<div className="space-y-2">
				<PhotoTextFields
					set={photo.set}
					photo={photo}
					withCaption
					result={photoSaveResult(updatePhoto)}
					onSave={(field, value) => updatePhoto.mutate({ set: photo.set, [field]: value })}
				/>
			</div>
			<div className="flex items-center gap-2">
				<Button
					disabled={isCover || missing}
					pending={update.isPending}
					onClick={() => update.mutate({ slug: collection.slug, cover: photo.set }, { onSuccess: onCoverSet })}
				>
					<LucideStar className="size-3.5" />
					{isCover ? "Cover" : "Set as cover"}
				</Button>
				<Button variant="ghost" danger onClick={() => showRemove(true)}>
					Remove
				</Button>
			</div>
			{failure && (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title={failure.title}
					message={serverErrorMessage(failure.error)}
				/>
			)}
			{!missing && <PhotoSizes set={photo.set} />}
			<RemoveFromCollectionDialog
				open={removing}
				onOpenChange={showRemove}
				collection={collection.name}
				set={photo.set}
				pending={members.isPending}
				error={members.error}
				onConfirm={() =>
					members.mutate({ sets: [photo.set], collection: null }, { onSuccess: () => showRemove(false) })
				}
			/>
		</div>
	);
};
