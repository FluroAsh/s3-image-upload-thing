import { useState } from "react";

import { LucideArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollections, useCreateCollection } from "@/lib/query";
import { setsToMove } from "~/shared/collections";

import { MoveSetsDialog } from "../collection-dialogs";
import { serverErrorMessage } from "../utils";
import { useCollectionsModal } from "./provider";
import { SetPicker } from "./set-picker";

export const CreateScreen = () => {
	const { setScreen } = useCollectionsModal();
	const { data } = useCollections();
	const create = useCreateCollection();
	const [name, setName] = useState("");
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const [confirming, setConfirming] = useState(false);

	const sets = [...picked];
	const moving = setsToMove(data, sets, null);

	const showConfirm = (next: boolean) => {
		create.reset();
		setConfirming(next);
	};

	const createCollection = () =>
		create.mutate({ name: name.trim(), sets }, { onSuccess: () => setScreen({ screen: "list" }) });

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (moving.length) showConfirm(true);
		else createCollection();
	};

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<Button variant="ghost" onClick={() => setScreen({ screen: "list" })}>
				<LucideArrowLeft className="size-4" />
				Back to collections
			</Button>
			<Input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
			<SetPicker picked={picked} onChange={setPicked} />

			{create.error && <p className="text-body text-err">{serverErrorMessage(create.error, "Could not create.")}</p>}

			<Button type="submit" variant="primary" disabled={!name.trim() || !picked.size} pending={create.isPending}>
				Create
			</Button>
			<MoveSetsDialog
				open={confirming}
				onOpenChange={showConfirm}
				moving={moving}
				into={name.trim()}
				pending={create.isPending}
				error={create.error}
				onConfirm={createCollection}
			/>
		</form>
	);
};
