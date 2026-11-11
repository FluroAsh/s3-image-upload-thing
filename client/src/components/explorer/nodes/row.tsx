import type { ReactNode } from "react";

import { LucideChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { getDepthPadding } from "../utils";

type TreeRowProps = {
	/** Full key of the node; the tree finds the row by it to move focus. */
	id: string;
	/** Accessible name for rows whose visible text is not enough, such as a folder with a count. */
	label?: string;
	/** Tree depth, which sets the indent and `aria-level`. */
	depth: number;
	/** Whether this row is the one open in the details panel. */
	selected: boolean;
	/** `undefined` for rows that cannot expand; folders pass their state so the chevron and `aria-expanded` follow it. */
	expanded?: boolean;
	/** Whether this row is the tree's one tab stop. */
	tabbable: boolean;
	/** Row label, usually a `NodeName` beside its icon. */
	children: ReactNode;
	/** Right-hand text, such as a count or a size. */
	meta?: string | number;
	onActivate: () => void;
	onFocus: () => void;
};

/** The one tree row, so folders, sets and files share height, indent, stripe, hover and focus. */
export const TreeRow = ({
	id,
	label,
	depth,
	selected,
	expanded,
	tabbable,
	children,
	meta,
	onActivate,
	onFocus,
}: TreeRowProps) => (
	<div
		role="treeitem"
		aria-label={label}
		aria-level={depth + 1}
		aria-selected={selected}
		aria-expanded={expanded}
		data-tree-id={id}
		tabIndex={tabbable ? 0 : -1}
		className={cn(
			"group relative flex h-row cursor-pointer select-none items-center gap-1.5 rounded-md pr-2 text-body text-fg transition-colors duration-100",
			"focus-visible:-outline-offset-2",
			selected ? "bg-accent/12" : "hover:bg-raised",
		)}
		style={{ paddingLeft: getDepthPadding(depth) }}
		onClick={onActivate}
		onFocus={onFocus}
		onKeyDown={(event) => {
			if (event.target !== event.currentTarget || event.key !== "Enter") return;
			event.preventDefault();
			onActivate();
		}}
	>
		{selected && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 rounded-sm bg-accent" />}
		<span className="flex size-4 shrink-0 items-center justify-center text-fg-2">
			{expanded !== undefined && (
				<LucideChevronRight className={cn("size-3.5 transition-transform duration-100", expanded && "rotate-90")} />
			)}
		</span>
		{children}
		{meta !== undefined && <span className="shrink-0 font-mono text-caption text-fg-1">{meta}</span>}
	</div>
);

type NodeNameProps = {
	name: string;
	/** The active filter; the first match in the name is highlighted. */
	query: string;
};

export const NodeName = ({ name, query }: NodeNameProps) => {
	const needle = query.trim();
	const start = needle ? name.toLowerCase().indexOf(needle.toLowerCase()) : -1;

	return (
		<span className={"min-w-0 flex-1 truncate"} title={name}>
			{start < 0 ? (
				name
			) : (
				<>
					{name.slice(0, start)}
					<mark className="rounded-sm bg-accent/30 text-fg">{name.slice(start, start + needle.length)}</mark>
					{name.slice(start + needle.length)}
				</>
			)}
		</span>
	);
};
