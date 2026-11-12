import { LucideX } from "lucide-react";

import { SECTION_LABEL } from "@/components/ui/section-label";
import { useCollections } from "@/lib/query";
import { cn } from "@/lib/utils";
import { holdingSet } from "~/shared/collections";
import type { TreeNode } from "~/shared/types";

import { CollectionThumb, SetIcon } from "./collection-thumb";

type TrayProps = {
	/** Sets to be added, in tree order, each with its folder. */
	picked: [string, TreeNode][];
	/** Called with the set to untick. */
	onRemove: (set: string) => void;
};

const Tile = ({ set, folder, onRemove }: { set: string; folder: TreeNode; onRemove: TrayProps["onRemove"] }) => {
	const { data } = useCollections();
	const from = holdingSet(data, set)?.collection.name;

	return (
		<li className="w-16 shrink-0">
			<button
				type="button"
				aria-label={`Remove ${folder.name}`}
				title={folder.name}
				onClick={() => onRemove(set)}
				className="group grid w-full gap-[3px] rounded-md text-left text-fg-1 text-caption outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
			>
				<span className="relative block">
					<CollectionThumb
						folder={folder}
						className="size-16"
						only={["thumbnail"]}
						fallback={<SetIcon className="size-5" />}
						fallbackClassName="border border-dashed border-line-strong"
					/>
					{from && (
						<span className="absolute bottom-[3px] left-[3px] inline-flex h-4 max-w-[58px] items-center gap-1 rounded-sm bg-black/80 px-1 font-mono text-[10px] text-fg-1">
							<span className="size-1.5 shrink-0 rounded-full bg-warn" />
							<span className="truncate">{from}</span>
						</span>
					)}
					<span
						className={cn(
							"absolute top-[3px] right-[3px] hidden size-4 place-items-center rounded-sm bg-black/80 text-fg",
							"group-hover:grid group-focus-visible:grid",
						)}
					>
						<LucideX className="size-2.5" />
					</span>
				</span>
				<span className="truncate">{folder.name}</span>
			</button>
		</li>
	);
};

/** One row of 64px tiles for the sets about to be added; it keeps its height when empty so the modal does not jump on the first tick. */
export const PickedTray = ({ picked, onRemove }: TrayProps) => (
	<div className="space-y-1.5">
		<div className={SECTION_LABEL}>Picked · {picked.length}</div>
		{picked.length ? (
			<ul className="flex h-24 gap-2 overflow-x-auto overflow-y-hidden p-0.5 [scrollbar-width:thin]">
				{picked.map(([set, folder]) => (
					<Tile key={set} set={set} folder={folder} onRemove={onRemove} />
				))}
			</ul>
		) : (
			<div className="grid h-24 place-items-center rounded-md border border-dashed border-line-strong text-fg-2 text-secondary">
				Picked sets show here
			</div>
		)}
	</div>
);
