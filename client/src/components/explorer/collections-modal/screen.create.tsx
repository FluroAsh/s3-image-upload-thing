import { useState } from "react";

import { LucideAlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections, useCreateCollection } from "@/lib/query";
import { setsToMove } from "~/shared/collections";

import { MoveSetsDialog, slugHint } from "../collection-dialogs";
import { serverErrorMessage } from "../utils";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";
import { pickedSummary, SetPicker } from "./set-picker";

export const CreateScreen = () => {
	const { setScreen } = useCollectionsModal();
	const { data } = useCollections();
	const create = useCreateCollection();
	const [name, setName] = useState("");
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const [confirming, setConfirming] = useState(false);

	const sets = [...picked];
	const moving = setsToMove(data, sets, null);
	const hint = slugHint(name.trim());

	const back = () => setScreen({ screen: "list" });

	const showConfirm = (next: boolean) => {
		create.reset();
		setConfirming(next);
	};

	const createCollection = () => create.mutate({ name: name.trim(), sets }, { onSuccess: back });

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (moving.length) showConfirm(true);
		else createCollection();
	};

	return (
		<form onSubmit={onSubmit} className="contents">
			<ScreenHeader title="New collection" onBack={back} backLabel="Back to collections" />
			<DialogBody className="space-y-3">
				<div>
					<label htmlFor="collection-name" className="mb-1 block text-caption text-fg-2">
						Name
					</label>
					<Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} />
					<p className="mt-1 h-4 font-mono text-caption text-fg-2">{hint}</p>
				</div>
				<SetPicker picked={picked} onChange={setPicked} />
				{create.error && !confirming && (
					<StateMessage
						size="inline"
						tone="err"
						icon={LucideAlertTriangle}
						title="Could not create"
						message={serverErrorMessage(create.error)}
					/>
				)}
			</DialogBody>
			<ScreenFooter info={pickedSummary(sets.length, moving.length)}>
				<Button onClick={back}>Cancel</Button>
				<Button type="submit" variant="primary" disabled={!name.trim() || !picked.size} pending={create.isPending}>
					Create
				</Button>
			</ScreenFooter>
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
