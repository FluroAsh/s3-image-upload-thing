import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCollections, useSetMembers } from "@/lib/query";
import { setsNotIn, setsToMove } from "~/shared/collections";
import type { Collection } from "~/shared/types";

import { MoveSetsDialog } from "../collection-dialogs";
import { serverErrorMessage } from "../utils";
import { SetPicker } from "./set-picker";

export const AddSets = ({ collection, onDone }: { collection: Collection; onDone: () => void }) => {
	const { data } = useCollections();
	const add = useSetMembers();
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const sets = setsNotIn(collection, picked);

	const [confirming, setConfirming] = useState(false);
	const moving = setsToMove(data, sets, collection.slug);

	const showConfirm = (next: boolean) => {
		add.reset();
		setConfirming(next);
	};

	const addSets = () => add.mutate({ sets, collection: collection.slug }, { onSuccess: onDone });

	return (
		<div className="space-y-3">
			<SetPicker picked={picked} onChange={setPicked} locked={new Set(collection.photos.map((photo) => photo.set))} />
			{add.error && !confirming && (
				<p className="text-body text-err">{serverErrorMessage(add.error, "Could not add.")}</p>
			)}
			<div className="flex gap-2">
				<Button
					variant="primary"
					disabled={!sets.length}
					pending={add.isPending}
					onClick={() => (moving.length ? showConfirm(true) : addSets())}
				>
					Add to {collection.name}
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancel
				</Button>
			</div>
			<MoveSetsDialog
				open={confirming}
				onOpenChange={showConfirm}
				moving={moving}
				into={collection.name}
				pending={add.isPending}
				error={add.error}
				onConfirm={addSets}
			/>
		</div>
	);
};
