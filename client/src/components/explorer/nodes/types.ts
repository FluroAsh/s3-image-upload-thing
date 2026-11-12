import type { TreeRowData } from "../tree-rows";
import type { CollectionAssign } from "../use-collection-move";

/** Props every node component takes from the tree. */
export type NodeProps = {
	row: TreeRowData;
	/** The active filter, for highlighting. */
	query: string;
	/** Whether this row is the tree's one tab stop. */
	tabbable: boolean;
	/** Called when the row takes focus, so the tree knows which row is its tab stop. */
	onFocus: () => void;
	/** Add, move and remove writes for the sets a menu item picks. */
	assign: CollectionAssign;
};
