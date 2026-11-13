/** Returns a runner that starts at most `limit` of the tasks passed to it at once; the rest wait their turn in order. */
export const limitConcurrency = (limit: number) => {
	let active = 0;
	const waiting: (() => void)[] = [];

	const release = () => {
		active--;
		waiting.shift()?.();
	};

	return async <T>(task: () => Promise<T>): Promise<T> => {
		if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
		active++;
		try {
			return await task();
		} finally {
			release();
		}
	};
};
