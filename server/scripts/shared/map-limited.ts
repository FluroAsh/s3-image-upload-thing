/** Items a `mapLimited` run has not finished, for a caller that needs to report them if the run stops. */
export type Unfinished<Item> = {
	/** How many items the run was given. */
	total: number;
	/** Receives every item up front and loses each as it settles, so what is left includes items no worker has started. Only add and delete, so a set of a wider type can track a narrower item. */
	items: {
		add: (item: Item) => unknown;
		delete: (item: Item) => unknown;
	};
};

/** Sets worked on at once; each makes a handful of requests together, so requests in flight stay in the low tens. */
export const SET_CONCURRENCY = 4;

/** Runs `run` over `items`, at most `limit` at a time; the results keep the order of `items`. `unfinished`, when given, tracks what has not settled. */
export const mapLimited = async <Item, Result>(
	items: readonly Item[],
	limit: number,
	run: (item: Item) => Promise<Result>,
	unfinished?: Unfinished<Item>,
): Promise<Result[]> => {
	const results: Result[] = [];
	let next = 0;
	if (unfinished) {
		unfinished.total = items.length;
		for (const item of items) unfinished.items.add(item);
	}
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next++;
			results[index] = await run(items[index]);
			unfinished?.items.delete(items[index]);
		}
	};

	await Promise.all(Array.from({ length: limit }, worker));

	return results;
};
