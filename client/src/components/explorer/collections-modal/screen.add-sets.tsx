import { useState } from "react";

import { useCollections, useSetMembers } from "@/lib/query";
import type { Collection } from "~/shared/types";

import { serverErrorMessage } from "../utils";
import { confirmMove } from "./confirm-move";
import { SetPicker } from "./set-picker";

export const AddSets = ({ collection, onDone }: { collection: Collection; onDone: () => void }) => {
	const { data } = useCollections();
	const add = useSetMembers();
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const onAdd = () => {
		const held = new Set(collection.photos.map((p) => p.set));
		const sets = [...picked].filter((set) => !held.has(set));
		if (!confirmMove(data, sets, collection.slug)) return;

		add.mutate({ sets, collection: collection.slug }, { onSuccess: onDone });
	};

	return (
		<div className="space-y-3">
			<SetPicker picked={picked} onChange={setPicked} />
			{add.error && <p className="text-sm text-red-500">{serverErrorMessage(add.error, "Could not add.")}</p>}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={!picked.size || add.isPending}
					onClick={onAdd}
					className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-neutral-100 text-sm font-medium rounded-lg"
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
