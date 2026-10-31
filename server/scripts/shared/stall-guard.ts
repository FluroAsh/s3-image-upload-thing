import type { SetIdentity } from "@/modules/storage/services/manifest";

import { setLabel } from "./listed";
import type { Unfinished } from "./map-limited";

/**
 * Runs `run`, and if the process runs out of work before it settles, names the sets it left unfinished, calls `onStopped` and exits non-zero.
 * The listener is removed once `run` settles, whether it returns or throws.
 */
export const guardStall = async <Result>(
	run: (unfinished: Unfinished<SetIdentity>) => Promise<Result>,
	onStopped?: () => void,
): Promise<Result> => {
	const items = new Set<SetIdentity>();
	const unfinished: Unfinished<SetIdentity> = { total: 0, items };
	const onStall = () => {
		const names = Array.from(items, (set) => `  ${setLabel(set)}`);
		console.error([`The run stopped with ${items.size} of ${unfinished.total} unfinished:`, ...names].join("\n"));
		process.exitCode = 1;
		onStopped?.();
	};
	process.once("beforeExit", onStall);

	try {
		return await run(unfinished);
	} finally {
		process.off("beforeExit", onStall);
	}
};
