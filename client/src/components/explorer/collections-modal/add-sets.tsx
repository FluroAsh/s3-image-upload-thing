import { useState } from "react";

import { useCollections, useSetMembers } from "@/lib/query";
import { cn } from "@/lib/utils";
import { setsNotIn } from "~/shared/collections";
import type { Collection } from "~/shared/types";

import { PRIMARY_BUTTON_CLASS, serverErrorMessage } from "../utils";
import { confirmMove } from "./confirm-move";
import { SetPicker } from "./set-picker";

export const AddSets = ({ collection, onDone }: { collection: Collection; onDone: () => void }) => {
	const { data } = useCollections();
	const add = useSetMembers();
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const sets = setsNotIn(collection, picked);

	const onAdd = () => {
		if (!confirmMove(data, sets, collection.slug)) return;

		add.mutate({ sets, collection: collection.slug }, { onSuccess: onDone });
	};

	return (
		<div className="space-y-3">
			<SetPicker picked={picked} onChange={setPicked} locked={new Set(collection.photos.map((photo) => photo.set))} />
			{add.error && <p className="text-sm text-red-500">{serverErrorMessage(add.error, "Could not add.")}</p>}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={!sets.length || add.isPending}
					onClick={onAdd}
					className={cn("px-4 py-2", PRIMARY_BUTTON_CLASS)}
				>
					Add to {collection.name}
				</button>
				<button type="button" onClick={onDone} className="px-4 py-2 text-sm text-slate-300 hover:text-neutral-100">
					Cancel
				</button>
			</div>
		</div>
	);
};
