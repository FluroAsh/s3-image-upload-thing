import { LucideAlertTriangle, LucideFolderHeart, LucideLoader2 } from "lucide-react";

import { useCollections, useCreateCollection, useSetMembers, useUpdatePhoto } from "@/lib/query";

import { StateMessage } from "../ui/state-message";
import { findPhoto, serverErrorMessage } from "./utils";

const NONE = "";
// A real slug can't hold underscores, so this never collides with one.
const NEW = "__new__";

const FIELD = "w-full rounded-lg bg-slate-700/60 border border-slate-600 p-2 text-sm text-neutral-100";

export const CollectionSection = ({ setPath }: { setPath: string }) => {
	const { data, isLoading, error } = useCollections();
	const create = useCreateCollection();
	const setMembers = useSetMembers();
	const updatePhoto = useUpdatePhoto();

	const saved = findPhoto(data, setPath);
	const writeError = create.error ?? setMembers.error ?? updatePhoto.error;

	const choose = (value: string) => {
		const target = value === NEW ? window.prompt("Name the new collection") : value;
		if (target === null || (value === NEW && !target.trim())) return;

		const from = saved?.collection;
		const isMove = from && target !== NONE && from.slug !== target;
		if (isMove && !window.confirm(`Move this set out of "${from.name}"?`)) return;

		if (value === NEW) create.mutate({ name: target, sets: [setPath] });
		else setMembers.mutate({ sets: [setPath], collection: target === NONE ? null : target });
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
						className={FIELD}
						value={saved?.collection.slug ?? NONE}
						disabled={create.isPending || setMembers.isPending}
						onChange={(e) => choose(e.target.value)}
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
						className={FIELD}
						defaultValue={saved?.photo.alt ?? ""}
						disabled={!saved}
						onBlur={(e) => {
							if (e.target.value !== (saved?.photo.alt ?? ""))
								updatePhoto.mutate({ set: setPath, alt: e.target.value });
						}}
					/>

					{writeError && <p className="text-xs text-red-500">{serverErrorMessage(writeError, "Could not save.")}</p>}
				</div>
			)}
		</div>
	);
};
