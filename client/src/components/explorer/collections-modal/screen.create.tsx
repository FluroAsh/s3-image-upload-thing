import { useState } from "react";

import { LucideArrowLeft } from "lucide-react";

import { useCollections, useCreateCollection } from "@/lib/query";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { serverErrorMessage } from "../utils";
import { confirmMove } from "./confirm-move";
import { useCollectionsModal } from "./provider";
import { SetPicker } from "./set-picker";

export const CreateScreen = () => {
	const { setScreen } = useCollectionsModal();
	const { data } = useCollections();
	const create = useCreateCollection();
	const [name, setName] = useState("");
	const [picked, setPicked] = useState<Set<string>>(new Set());

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const sets = [...picked];
		if (!confirmMove(data, sets, null)) return;

		create.mutate({ name: name.trim(), sets }, { onSuccess: () => setScreen({ screen: "list" }) });
	};

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<Button variant="ghost" onClick={() => setScreen({ screen: "list" })}>
				<LucideArrowLeft className="size-4" />
				Back to collections
			</Button>
			<Input
				aria-label="Name"
				placeholder="Name"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<SetPicker picked={picked} onChange={setPicked} />

			{create.error && <p className="text-body text-err">{serverErrorMessage(create.error, "Could not create.")}</p>}

			<Button type="submit" variant="primary" disabled={!name.trim() || !picked.size} pending={create.isPending}>
				Create
			</Button>
		</form>
	);
};
