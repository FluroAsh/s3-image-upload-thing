import { setsToMove } from "~/shared/collections";
import type { CollectionsFile } from "~/shared/types";

/** Lists the sets a write into collection `into` takes out of other collections and asks to confirm; true when nothing moves or the user agrees. */
export const confirmMove = (file: CollectionsFile | undefined, sets: string[], into: string | null) => {
	const moving = setsToMove(file, sets, into);
	if (!moving.length) return true;

	const list = moving.map(({ set, from }) => `${set} (from "${from.name}")`).join("\n");
	return window.confirm(`Move these sets out of their collections?\n\n${list}`);
};
