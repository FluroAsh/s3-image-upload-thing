import type { Collection, CollectionPhoto, CollectionsFile } from "./types";

export const holdingSet = (
	file: CollectionsFile | undefined,
	set: string,
): { collection: Collection; photo: CollectionPhoto } | undefined => {
	for (const collection of file?.collections ?? []) {
		const photo = collection.photos.find((candidate) => candidate.set === set);
		if (photo) return { collection, photo };
	}
};

/** Of `sets`, those a write into collection `into` (null: no collection) takes out of another one, with the collection each leaves. */
export const setsToMove = (file: CollectionsFile | undefined, sets: string[], into: string | null) =>
	sets.flatMap((set) => {
		const held = holdingSet(file, set);
		return held && held.collection.slug !== into ? [{ set, from: held.collection }] : [];
	});

export const coverOf = (collection: Collection) => collection.cover ?? collection.photos[0]?.set;

/** Of `picked`, the sets not already photos of `collection`. */
export const setsNotIn = (collection: Collection, picked: Iterable<string>) => {
	const held = new Set(collection.photos.map((p) => p.set));
	return Array.from(picked).filter((set) => !held.has(set));
};
