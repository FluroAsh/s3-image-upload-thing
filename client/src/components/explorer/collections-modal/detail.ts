import type { Collection } from "~/shared/types";

/** The set shown as the cover: the chosen one, else the first photo. */
export const coverOf = (collection: Collection) => collection.cover ?? collection.photos[0]?.set;

/** The sets with the one at `from` moved to index `to`. */
export const reorderSets = (sets: string[], from: number, to: number) => {
	const next = [...sets];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
};
