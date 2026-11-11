import { useExplorer } from "@/lib/providers/explorer-provider";

/** Opens a set in the details panel; the file tree and the attention list select a set the same way. */
export const useSetSelection = (setPath: string) => {
	const {
		actions: { select },
		state: { selection },
	} = useExplorer();
	const id = `${setPath}/`;

	return { isActive: selection?.kind === "set" && selection.id === id, select: () => select({ id, kind: "set" }) };
};
