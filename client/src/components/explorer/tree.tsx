import { useRef, useState } from "react";

import { LucideAlertTriangle, LucideX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { FileNode } from "./nodes/file";
import { FolderNode } from "./nodes/folder";
import { SetNode } from "./nodes/set";
import { isTreeKey, navigate, type TreeRowData } from "./tree-rows";
import { useCollectionMove } from "./use-collection-move";
import { serverErrorMessage, setPathOf } from "./utils";

type FileTreeProps = {
	rows: TreeRowData[];
	query: string;
	onToggle: (id: string) => void;
	onClearFilter: () => void;
};

export const FileTree = ({ rows, query, onToggle, onClearFilter }: FileTreeProps) => {
	const {
		actions: { setAttentionFolder, select },
	} = useExplorer();
	const collectionMove = useCollectionMove();
	const [focusedId, setFocusedId] = useState<string>();
	const listRef = useRef<HTMLDivElement>(null);
	const tabbableId = rows.some((row) => row.node.id === focusedId) ? focusedId : rows[0]?.node.id;

	const focusRow = (id: string) => {
		const items = listRef.current?.querySelectorAll<HTMLElement>("[data-tree-id]") ?? [];
		[...items].find((item) => item.dataset.treeId === id)?.focus();
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		const id = (event.target as HTMLElement).dataset.treeId;
		if (!id) return;

		if (event.key === "Escape") return onClearFilter();
		if (event.key.toLowerCase() === "a" && !event.metaKey && !event.ctrlKey && !event.altKey) {
			if (rows.find((row) => row.node.id === id)?.kind === "folder") setAttentionFolder(setPathOf(id));
			return;
		}
		if (!isTreeKey(event.key)) return;

		const move = navigate(rows, id, event.key);
		event.preventDefault();
		if (move?.type === "toggle") return onToggle(move.id);
		if (!move) return;
		focusRow(move.id);
		const target = rows.find((row) => row.node.id === move.id);
		if (target && target.kind !== "folder") select({ id: target.node.id, kind: target.kind });
	};

	return (
		<>
			<div ref={listRef} role="tree" aria-label="Files" className="p-1" onKeyDown={handleKeyDown}>
				{rows.map((row) => {
					const { node } = row;
					const shared = {
						row,
						query,
						tabbable: node.id === tabbableId,
						onFocus: () => setFocusedId(node.id),
						assign: collectionMove.assign,
					};

					return row.kind === "folder" ? (
						<FolderNode key={node.id} {...shared} onToggle={() => onToggle(node.id)} />
					) : row.kind === "set" ? (
						<SetNode key={node.id} {...shared} />
					) : (
						<FileNode key={node.id} {...shared} />
					);
				})}
				{collectionMove.dialogs}
			</div>
			{collectionMove.error && (
				<div className="flex items-start gap-1">
					<StateMessage
						size="inline"
						tone="err"
						icon={LucideAlertTriangle}
						title="Could not save"
						message={serverErrorMessage(collectionMove.error)}
						className="flex-1"
					/>
					<Button variant="icon" aria-label="Dismiss error" onClick={collectionMove.dismiss}>
						<LucideX className="size-3.5" />
					</Button>
				</div>
			)}
		</>
	);
};
