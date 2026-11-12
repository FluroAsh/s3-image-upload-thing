import { useCollections } from "@/lib/query";
import { holdingSet } from "~/shared/collections";

/** The collection that already holds the set, if any. */
export const useHeldBy = (set: string | undefined) => {
	const { data } = useCollections();
	return set === undefined ? undefined : holdingSet(data, set)?.collection;
};
