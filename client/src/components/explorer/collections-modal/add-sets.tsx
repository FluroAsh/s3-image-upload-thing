import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCollections, useSetMembers } from "@/lib/query";
import { setsNotIn } from "~/shared/collections";
import type { Collection } from "~/shared/types";

import { serverErrorMessage } from "../utils";
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
			{add.error && <p className="text-body text-err">{serverErrorMessage(add.error, "Could not add.")}</p>}
			<div className="flex gap-2">
				<Button variant="primary" disabled={!sets.length} pending={add.isPending} onClick={onAdd}>
					Add to {collection.name}
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancel
				</Button>
			</div>
		</div>
	);
};
