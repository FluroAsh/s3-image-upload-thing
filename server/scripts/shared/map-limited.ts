/** Sets worked on at once; each makes a handful of requests together, so requests in flight stay in the low tens. */
export const SET_CONCURRENCY = 4;

/** Runs `run` over `items`, at most `limit` at a time; the results keep the order of `items`. */
export const mapLimited = async <Item, Result>(
	items: readonly Item[],
	limit: number,
	run: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
	const results: Result[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next++;
			results[index] = await run(items[index]);
		}
	};
	await Promise.all(Array.from({ length: limit }, worker));

	return results;
};
