import { LucideDatabase, LucideFolderClosed, LucideImages } from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections } from "@/lib/query";
import { cn } from "@/lib/utils";
import { holdingSet } from "~/shared/collections";
import type { TreeNode } from "~/shared/types";

import { PartialNotice } from "../partial-notice";
import { getDepthPadding, isSetFolder, setsUnder, toggleSets } from "../utils";
import { useBucketSets } from "./use-bucket-sets";

const NONE: ReadonlySet<string> = new Set();

/** `locked` sets are already in the collection: shown ticked and faded, and never toggled. */
type PickerProps = {
	picked: ReadonlySet<string>;
	onChange: (picked: Set<string>) => void;
	locked?: ReadonlySet<string>;
};

const Row = ({
	label,
	icon: Icon,
	group,
	depth,
	picked,
	onChange,
	locked = NONE,
	note,
}: PickerProps & { label: string; icon: typeof LucideImages; group: string[]; depth: number; note?: string }) => {
	const free = group.filter((set) => !locked.has(set));
	const ticked = group.filter((set) => picked.has(set) || locked.has(set)).length;

	return (
		<label
			className={cn(
				"flex items-center gap-2 rounded-md py-1 pr-2 text-body text-fg",
				free.length ? "hover:bg-raised" : "cursor-not-allowed opacity-50",
			)}
			style={{ paddingLeft: getDepthPadding(depth) }}
		>
			<input
				type="checkbox"
				checked={ticked === group.length}
				disabled={!free.length}
				ref={(el) => {
					if (el) el.indeterminate = ticked > 0 && ticked < group.length;
				}}
				onChange={() => onChange(toggleSets(picked, free))}
			/>
			<Icon className="size-4 shrink-0 text-accent" />
			<span className="truncate">{label}</span>
			{note && <span className="ml-auto text-secondary text-warn">{note}</span>}
		</label>
	);
};

const Branch = ({ node, depth, ...pick }: PickerProps & { node: TreeNode; depth: number }) => {
	const { childMap, sets } = useBucketSets();
	const { data } = useCollections();

	const group = setsUnder(sets, node.id);
	if (!node.isFolder || !group.length) return null;

	if (isSetFolder(node, childMap.get(node.id))) {
		const held = holdingSet(data, group[0])?.collection;
		return (
			<Row
				{...pick}
				label={node.name}
				icon={LucideImages}
				group={group}
				depth={depth}
				note={held && `in ${held.name}`}
			/>
		);
	}

	return (
		<>
			<Row {...pick} label={node.name} icon={LucideFolderClosed} group={group} depth={depth} />
			{(childMap.get(node.id) ?? []).map((child) => (
				<Branch key={child.id} {...pick} node={child} depth={depth + 1} />
			))}
		</>
	);
};

/** The bucket as a tree of folders with sets as leaves; ticking a folder (the root included) ticks every set under it. */
export const SetPicker = (pick: PickerProps) => {
	const { bucketName } = useExplorer().state;
	const { childMap, sets, data } = useBucketSets();

	return (
		<div className="max-h-[320px] overflow-y-auto rounded-lg border border-line-strong p-2">
			{data?.partial && <PartialNotice count={data.tree.length} />}
			<Row {...pick} label={bucketName} icon={LucideDatabase} group={setsUnder(sets, "")} depth={0} />
			{(childMap.get("") ?? []).map((node) => (
				<Branch key={node.id} {...pick} node={node} depth={1} />
			))}
		</div>
	);
};
