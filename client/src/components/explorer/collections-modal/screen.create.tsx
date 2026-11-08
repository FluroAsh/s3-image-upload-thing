import { useState } from "react";

import { LucideArrowLeft } from "lucide-react";

import { useCollections, useCreateCollection } from "@/lib/query";

import { FIELD_CLASS, serverErrorMessage } from "../utils";
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
			<button
				type="button"
				onClick={() => setScreen({ screen: "list" })}
				className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-neutral-100"
			>
				<LucideArrowLeft className="size-4" />
				Back to collections
			</button>
			<input
				aria-label="Name"
				placeholder="Name"
				className={FIELD_CLASS}
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<SetPicker picked={picked} onChange={setPicked} />

			{create.error && <p className="text-sm text-red-500">{serverErrorMessage(create.error, "Could not create.")}</p>}

			<button
				type="submit"
				disabled={!name.trim() || !picked.size || create.isPending}
				className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-neutral-100 text-sm font-medium rounded-lg"
			>
				Create
			</button>
		</form>
	);
};
