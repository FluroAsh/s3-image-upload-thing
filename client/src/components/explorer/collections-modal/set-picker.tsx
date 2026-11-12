import { useMemo, useRef, useState } from "react";

import { LucideDatabase, LucideFolderClosed } from "lucide-react";

import { FilterInput } from "@/components/ui/filter-input";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { cn } from "@/lib/utils";
import type { Collection, TreeNode } from "~/shared/types";

import { PartialNotice } from "../partial-notice";
import {
	filterNeedle,
	formatCount,
	getDepthPadding,
	isSetFolder,
	matchesFilter,
	pickedInTreeOrder,
	setsUnder,
	toggleSets,
} from "../utils";
import { RowThumb } from "./collection-thumb";
import { PickedTray } from "./picked-tray";
import { useBucketSets } from "./use-bucket-sets";
import { useHeldBy } from "./use-held-by";

const NONE: ReadonlySet<string> = new Set();

type PickerProps = {
	/** Sets ticked so far. */
	picked: ReadonlySet<string>;
	/** Called with the new picked set when a row is toggled. */
	onChange: (picked: Set<string>) => void;
	/** Sets already in the collection: shown ticked and faded, and never toggled. */
	locked?: ReadonlySet<string>;
};

type BranchProps = PickerProps & {
	/** Sets that pass the filter; folders without one are hidden. */
	shown: ReadonlySet<string>;
};

/** Sets leaving another collection are named when they share one source, since the footer has room for one name. */
export const pickedSummary = (count: number, moving: { from: Collection }[]) => {
	if (!count) return "Pick at least one set";
	const sources = new Set(moving.map((m) => m.from.slug));
	const leaving = !moving.length
		? ""
		: ` · ${moving.length} ${moving.length === 1 ? "moves" : "move"} from ${sources.size === 1 ? moving[0].from.name : "other collections"}`;
	return `${formatCount(count, "set", false)} picked${leaving}`;
};

const Row = ({
	label,
	icon: Icon,
	folder,
	group,
	depth,
	picked,
	onChange,
	locked = NONE,
	note,
	count,
}: PickerProps & {
	/** Name of the folder or set. */
	label: string;
	/** Icon before the label; a set row shows its thumbnail instead. */
	icon?: typeof LucideDatabase;
	/** The set's folder, which a set row shows as a thumbnail. */
	folder?: TreeNode;
	/** Every set the row stands for; one for a set row. */
	group: string[];
	/** Tree depth, which sets the indent. */
	depth: number;
	/** Right-aligned note for a set row; it takes the place of the count. */
	note?: { text: string; warn?: boolean };
	/** Right-aligned count of the sets under a folder row. */
	count?: string;
}) => {
	const free = group.filter((set) => !locked.has(set));
	const ticked = group.filter((set) => picked.has(set) || locked.has(set)).length;

	return (
		<label
			className={cn(
				"flex h-row items-center gap-2 rounded-md pr-2 text-body text-fg",
				free.length ? "hover:bg-raised" : "cursor-not-allowed opacity-50",
			)}
			style={{ paddingLeft: getDepthPadding(depth) }}
		>
			<input
				type="checkbox"
				className="size-3.5 shrink-0 accent-accent"
				checked={ticked === group.length}
				disabled={!free.length}
				ref={(el) => {
					if (el) el.indeterminate = ticked > 0 && ticked < group.length;
				}}
				onChange={() => onChange(toggleSets(picked, free))}
			/>
			{folder ? <RowThumb folder={folder} /> : Icon && <Icon className="size-3.5 shrink-0 text-fg-2" />}
			<span className="truncate">{label}</span>
			{note ? (
				<span className={cn("ml-auto shrink-0 text-caption", note.warn ? "text-warn" : "text-fg-2")}>{note.text}</span>
			) : (
				count && <span className="ml-auto shrink-0 font-mono text-caption text-fg-2">{count}</span>
			)}
		</label>
	);
};

const Branch = ({ node, depth, shown, ...pick }: BranchProps & { node: TreeNode; depth: number }) => {
	const { childMap, sets } = useBucketSets();

	const group = setsUnder(sets, node.id).filter((set) => shown.has(set));
	const held = useHeldBy(node.isFolder && isSetFolder(node, childMap.get(node.id)) ? group[0] : undefined);
	if (!node.isFolder || !group.length) return null;

	if (isSetFolder(node, childMap.get(node.id))) {
		const note = pick.locked?.has(group[0]) ? { text: "already in" } : held && { text: `in ${held.name}`, warn: true };
		return <Row {...pick} label={node.name} folder={node} group={group} depth={depth} note={note || undefined} />;
	}

	return (
		<>
			<Row
				{...pick}
				label={node.name}
				icon={LucideFolderClosed}
				group={group}
				depth={depth}
				count={String(group.length)}
			/>
			{(childMap.get(node.id) ?? []).map((child) => (
				<Branch key={child.id} {...pick} shown={shown} node={child} depth={depth + 1} />
			))}
		</>
	);
};

/** The bucket as a tree of folders with sets as leaves; ticking a folder (the root included) ticks every set under it that passes the filter. */
export const SetPicker = (pick: PickerProps) => {
	const { bucketName } = useExplorer().state;
	const { childMap, sets, data } = useBucketSets();
	const [filter, setFilter] = useState("");
	const filterRef = useRef<HTMLInputElement>(null);

	const needle = filterNeedle(filter);
	const shown = useMemo(() => new Set([...sets.keys()].filter((set) => matchesFilter(set, needle))), [sets, needle]);
	const all = setsUnder(sets, "").filter((set) => shown.has(set));

	return (
		<div className="space-y-2">
			<FilterInput
				ref={filterRef}
				wrapperClassName="w-full"
				value={filter}
				onChange={(e) => setFilter(e.target.value)}
				placeholder="Filter sets…"
				aria-label="Filter sets"
			/>
			{data?.partial && <PartialNotice count={data.tree.length} />}
			<div className="max-h-[320px] overflow-y-auto rounded-md border border-line-strong p-1">
				{all.length ? (
					<>
						<Row
							{...pick}
							label={bucketName}
							icon={LucideDatabase}
							group={all}
							depth={0}
							count={formatCount(all.length, "set", false)}
						/>
						{(childMap.get("") ?? []).map((node) => (
							<Branch key={node.id} {...pick} shown={shown} node={node} depth={1} />
						))}
					</>
				) : (
					<p className="px-2 py-3 text-center text-secondary text-fg-2">
						{needle ? `No sets match “${filter.trim()}”` : "No sets in this bucket yet"}
					</p>
				)}
			</div>
			<PickedTray
				picked={pickedInTreeOrder(sets, pick.picked)}
				onRemove={(set) => pick.onChange(toggleSets(pick.picked, [set]))}
				onEmptied={() => filterRef.current?.focus()}
			/>
		</div>
	);
};
