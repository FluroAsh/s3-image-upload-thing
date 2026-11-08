import { LucideAlertTriangle, LucideFolderHeart, LucideLoader2 } from "lucide-react";

import { useCollections, useCreateCollection, useSetMembers, useUpdatePhoto } from "@/lib/query";
import { holdingSet, setsToMove } from "~/shared/collections";

import { StateMessage } from "../ui/state-message";
import { serverErrorMessage } from "./utils";

const NONE = "";
// A real slug can't hold underscores, so this never collides with one.
const NEW = "__new__";

const FIELD_CLASS = "w-full rounded-lg bg-slate-700/60 border border-slate-600 p-2 text-sm text-neutral-100";

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
				? `Remove this set from "${leaving?.name}"? Its alt text and caption are deleted.`
				: `Move this set out of "${leaving?.name}"?`;
		if (leaving && !window.confirm(prompt)) return;

		if (value === NEW) create.mutate({ name: target, sets: [setPath] });
		else setMembers.mutate({ sets: [setPath], collection: into });
	};

	return (
		<div className="p-6 border-b border-slate-600">
			<div className="flex items-center gap-2 mb-3">
				<LucideFolderHeart className="size-4 text-sky-400" />
				<h3 className="text-sm font-medium text-neutral-100">Collection</h3>
			</div>

			{isLoading ? (
				<StateMessage size="inline" tone="info" spin icon={LucideLoader2} title="Loading collections..." />
			) : error ? (
				<StateMessage
					size="inline"
					tone="error"
					icon={LucideAlertTriangle}
					title="Failed to load collections"
					message={serverErrorMessage(error, "Something went wrong. Try again shortly.")}
				/>
			) : (
				<div className="space-y-3">
					<select
						aria-label="Collection"
						className={FIELD_CLASS}
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
					</select>

					{/* Keyed on the saved text so a refetch resets what was typed. */}
					<input
						key={`${setPath}:${saved?.photo.alt ?? ""}`}
						aria-label="Alt text"
						placeholder={saved ? "Alt text" : "Add to a collection to set alt text"}
						className={FIELD_CLASS}
						defaultValue={saved?.photo.alt ?? ""}
						disabled={!saved}
						onBlur={(e) => {
							if (e.target.value !== (saved?.photo.alt ?? ""))
								updatePhoto.mutate({ set: setPath, alt: e.target.value || null });
						}}
					/>

					{writeError && (
						<StateMessage
							size="inline"
							tone="error"
							icon={LucideAlertTriangle}
							title="Could not save"
							message={serverErrorMessage(writeError, "Something went wrong. Try again shortly.")}
						/>
					)}
				</div>
			)}
		</div>
	);
};
