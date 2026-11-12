import { useId } from "react";

import { LucideAlertTriangle, LucideLoader2 } from "lucide-react";

import { Select } from "@/components/ui/select";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections, useUpdatePhoto } from "@/lib/query";
import { holdingSet } from "~/shared/collections";

import { InspectorSection } from "./inspector";
import { PhotoTextFields, photoSaveResult } from "./photo-text-fields";
import { useCollectionMove } from "./use-collection-move";
import { serverErrorMessage } from "./utils";

const NONE = "";
/** A real slug can't hold underscores, so this never collides with one. */
const NEW = "__new__";

export const CollectionSection = ({ setPath }: { setPath: string }) => {
	const { data, isLoading, error } = useCollections();
	const selectId = useId();
	const move = useCollectionMove();
	const updatePhoto = useUpdatePhoto();

	const saved = holdingSet(data, setPath);

	const onCollectionChange = (value: string) => {
		if (value === NEW) move.assign.toNew([setPath]);
		else move.assign.toCollection([setPath], value === NONE ? null : value);
	};

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
							disabled={move.pending}
							invalid={!!move.error}
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
					{move.error && (
						<StateMessage
							size="inline"
							tone="err"
							icon={LucideAlertTriangle}
							title="Could not save"
							message={serverErrorMessage(move.error)}
						/>
					)}

					<PhotoTextFields
						set={setPath}
						photo={saved?.photo}
						withCaption
						altPlaceholder={saved ? undefined : "Add to a collection to set alt text"}
						result={photoSaveResult(updatePhoto)}
						onSave={(field, value) => updatePhoto.mutate({ set: setPath, [field]: value })}
					/>
					<p className="text-caption text-fg-2">Saves on blur</p>
				</div>
			)}

			{move.dialogs}
		</InspectorSection>
	);
};
