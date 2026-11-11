import { useRef, useState } from "react";

import { FileNode } from "./nodes/file";
import { FolderNode } from "./nodes/folder";
import { SetNode } from "./nodes/set";
import { navigate, type TreeKey, type TreeRowData } from "./tree-rows";

const NAV_KEYS: readonly string[] = [
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
] satisfies TreeKey[];

type FileTreeProps = {
	rows: TreeRowData[];
	query: string;
	onToggle: (id: string) => void;
};

export const FileTree = ({ rows, query, onToggle }: FileTreeProps) => {
	const [focusedId, setFocusedId] = useState<string>();
	const listRef = useRef<HTMLDivElement>(null);
	const tabbableId = rows.some((row) => row.node.id === focusedId) ? focusedId : rows[0]?.node.id;

	const focusRow = (id: string) => {
		const items = listRef.current?.querySelectorAll<HTMLElement>("[data-tree-id]") ?? [];
		[...items].find((item) => item.dataset.treeId === id)?.focus();
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		const id = (event.target as HTMLElement).dataset.treeId;
		if (!id || !NAV_KEYS.includes(event.key)) return;

		const move = navigate(rows, id, event.key as TreeKey);
		event.preventDefault();
		if (move?.type === "focus") focusRow(move.id);
		else if (move) onToggle(move.id);
	};

	return (
		<div ref={listRef} role="tree" aria-label="Files" className="p-1" onKeyDown={handleKeyDown}>
			{rows.map((row) => {
				const { node } = row;
				const shared = {
					row,
					query,
					tabbable: node.id === tabbableId,
					onFocus: () => setFocusedId(node.id),
				};

				return row.kind === "folder" ? (
					<FolderNode key={node.id} {...shared} onToggle={() => onToggle(node.id)} />
				) : row.kind === "set" ? (
					<SetNode key={node.id} {...shared} />
				) : (
					<FileNode key={node.id} {...shared} />
				);
			})}
		</div>
	);
};
