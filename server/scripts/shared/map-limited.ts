/** Sets worked on at once; each makes a handful of requests together, so requests in flight stay in the low tens. */
export const SET_CONCURRENCY = 4;

/** Runs `run` over `items`, at most `limit` at a time; the results keep the order of `items`. `label` names an item left unfinished. */
export const mapLimited = async <Item, Result>(
	items: readonly Item[],
	limit: number,
	run: (item: Item) => Promise<Result>,
	label: (item: Item) => string,
): Promise<Result[]> => {
	const results: Result[] = [];
	const unfinished = new Set(items.keys());
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next++;
			results[index] = await run(items[index]);
			unfinished.delete(index);
		}
	};

	// Bun exits 0 once its event loop is empty, even with work still pending, so a run that can never finish would pass for one that did.
	const onStalled = () => {
		const names = Array.from(unfinished, (index) => `  ${label(items[index])}`);
		console.error([`The run stopped with ${unfinished.size} of ${items.length} unfinished:`, ...names].join("\n"));
		process.exitCode = 1;
	};
	process.once("beforeExit", onStalled);

	try {
		await Promise.all(Array.from({ length: limit }, worker));
	} finally {
		process.off("beforeExit", onStalled);
	}

	return results;
};
