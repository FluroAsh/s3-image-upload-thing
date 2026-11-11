import { LucideAlertTriangle, LucideFolderHeart, LucideLoader2 } from "lucide-react";

import { useCollections, useCreateCollection, useSetMembers, useUpdatePhoto } from "@/lib/query";
import { holdingSet, setsToMove } from "~/shared/collections";

import { Select } from "../ui/select";
import { StateMessage } from "../ui/state-message";
import { PhotoTextFields, TEXT_DELETED_NOTE } from "./photo-text-fields";
import { serverErrorMessage } from "./utils";

const NONE = "";
// A real slug can't hold underscores, so this never collides with one.
const NEW = "__new__";

export const CollectionSection = ({ setPath }: { setPath: string }) => {
	const { data, isLoading, error } = useCollections();
	const create = useCreateCollection();
	const setMembers = useSetMembers();
	const updatePhoto = useUpdatePhoto();

	const saved = holdingSet(data, setPath);
	const writeError = create.error ?? setMembers.error ?? updatePhoto.error;

	const onCollectionChange = (value: string) => {
		const target = value === NEW ? window.prompt("Name the new collection") : value;
		if (target === null || (value === NEW && !target.trim())) return;

		const into = target === NONE ? null : target;
		const leaving = setsToMove(data, [setPath], into)[0]?.from;
		// Dropping a set from every collection deletes its alt text and caption, and the collection if it was the last set.
		const prompt =
			into === null
				? `Remove this set from "${leaving?.name}"? ${TEXT_DELETED_NOTE}`
				: `Move this set out of "${leaving?.name}"?`;
		if (leaving && !window.confirm(prompt)) return;

		if (value === NEW) create.mutate({ name: target, sets: [setPath] });
		else setMembers.mutate({ sets: [setPath], collection: into });
	};

	return (
		<div className="p-6 border-b border-line">
			<div className="flex items-center gap-2 mb-3">
				<LucideFolderHeart className="size-4 text-accent" />
				<h3 className="text-body font-medium text-fg">Collection</h3>
			</div>

			{isLoading ? (
				<StateMessage size="inline" spin icon={LucideLoader2} title="Loading collections..." />
			) : error ? (
				<StateMessage
					size="inline"
					tone="error"
					icon={LucideAlertTriangle}
					title="Failed to load collections"
					message={serverErrorMessage(error)}
				/>
			) : (
				<div className="space-y-3">
					<Select
						aria-label="Collection"
						value={saved?.collection.slug ?? NONE}
						disabled={create.isPending || setMembers.isPending}
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

					<PhotoTextFields
						set={setPath}
						photo={saved?.photo}
						altPlaceholder="Add to a collection to set alt text"
						onSave={(field, value) => updatePhoto.mutate({ set: setPath, [field]: value })}
					/>

					{writeError && (
						<StateMessage
							size="inline"
							tone="error"
							icon={LucideAlertTriangle}
							title="Could not save"
							message={serverErrorMessage(writeError)}
						/>
					)}
				</div>
			)}
		</div>
	);
};
