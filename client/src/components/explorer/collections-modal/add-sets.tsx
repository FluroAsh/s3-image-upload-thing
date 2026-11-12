import { useState } from "react";

import { LucideAlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody } from "@/components/ui/dialog";
import { StateMessage } from "@/components/ui/state-message";
import { useCollections, useSetMembers } from "@/lib/query";
import { setsNotIn, setsToMove } from "~/shared/collections";
import type { Collection } from "~/shared/types";

import { MoveSetsDialog } from "../collection-dialogs";
import { formatCount, serverErrorMessage } from "../utils";
import { useCollectionsModal } from "./provider";
import { ScreenFooter, ScreenHeader } from "./screen-frame";
import { pickedSummary, SetPicker } from "./set-picker";
import { WithCollection } from "./with-collection";

const AddSetsForm = ({ collection }: { collection: Collection }) => {
	const { setScreen } = useCollectionsModal();
	const { data } = useCollections();
	const add = useSetMembers();
	const [picked, setPicked] = useState<Set<string>>(new Set());
	const [confirming, setConfirming] = useState(false);

	const sets = setsNotIn(collection, picked);
	const moving = setsToMove(data, sets, collection.slug);

	const back = () => setScreen({ screen: "detail", slug: collection.slug });

	const showConfirm = (next: boolean) => {
		add.reset();
		setConfirming(next);
	};

	const addSets = () => add.mutate({ sets, collection: collection.slug }, { onSuccess: back });

	return (
		<>
			<ScreenHeader
				title="Add sets"
				subtitle={`to ${collection.name}`}
				onBack={back}
				backLabel={`Back to ${collection.name}`}
			/>
			<DialogBody className="space-y-2">
				<SetPicker picked={picked} onChange={setPicked} locked={new Set(collection.photos.map((photo) => photo.set))} />
				{add.error && !confirming && (
					<StateMessage
						size="inline"
						tone="err"
						icon={LucideAlertTriangle}
						title="Could not add"
						message={serverErrorMessage(add.error)}
					/>
				)}
			</DialogBody>
			<ScreenFooter info={pickedSummary(sets.length, moving)}>
				<Button onClick={back}>Cancel</Button>
				<Button
					variant="primary"
					disabled={!sets.length}
					pending={add.isPending}
					onClick={() => (moving.length ? showConfirm(true) : addSets())}
				>
					{sets.length ? `Add ${formatCount(sets.length, "set", false)}` : "Add sets"}
				</Button>
			</ScreenFooter>
			<MoveSetsDialog
				open={confirming}
				onOpenChange={showConfirm}
				moving={moving}
				into={collection.name}
				pending={add.isPending}
				error={add.error}
				onConfirm={addSets}
			/>
		</>
	);
};

export const AddSets = ({ slug }: { slug: string }) => (
	<WithCollection slug={slug}>{(collection) => <AddSetsForm collection={collection} />}</WithCollection>
);
