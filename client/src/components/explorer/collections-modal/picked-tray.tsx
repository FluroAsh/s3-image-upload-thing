import { LucideX } from "lucide-react";

import { SECTION_LABEL } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import type { TreeNode } from "~/shared/types";

import { CollectionThumb, SetIcon } from "./collection-thumb";
import { TILE_BADGE } from "./photo-tile";
import { useHeldBy } from "./use-held-by";

type TrayProps = {
	/** Sets to be added, in tree order, each with its folder. */
	picked: [string, TreeNode][];
	/** Called with the set to untick. */
	onRemove: (set: string) => void;
	/** Called when the last tile is removed, so focus has somewhere to go. */
	onEmptied: () => void;
};

type TileProps = Pick<TrayProps, "onRemove" | "onEmptied"> & {
	/** The set's path, as the picker keys it. */
	set: string;
	/** The set's folder in the tree, for its name and thumbnail. */
	folder: TreeNode;
};

const Tile = ({ set, folder, onRemove, onEmptied }: TileProps) => {
	const from = useHeldBy(set)?.name;

	const remove = (li: HTMLElement | null) => {
		const neighbour = li?.nextElementSibling ?? li?.previousElementSibling;
		onRemove(set);
		if (neighbour) neighbour.querySelector("button")?.focus();
		else onEmptied();
	};

	return (
		<li className="w-16 shrink-0">
			<button
				type="button"
				aria-label={`Remove ${folder.name}`}
				title={folder.name}
				onClick={(e) => remove(e.currentTarget.closest("li"))}
				className="group grid w-full gap-1 rounded-md text-left text-fg-1 text-caption outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
			>
				<span className="relative block">
					<CollectionThumb
						folder={folder}
						className="size-16 data-[missing]:border data-[missing]:border-dashed data-[missing]:border-line-strong"
						thumbnailOnly
						fallback={<SetIcon className="size-5" />}
					/>
					{from && (
						<span className={cn(TILE_BADGE, "bottom-1 left-1 inline-flex max-w-14 items-center gap-1 text-fg-1")}>
							<span className="size-1.5 shrink-0 rounded-full bg-warn" />
							<span className="truncate">{from}</span>
						</span>
					)}
					<span
						className={cn(
							TILE_BADGE,
							"top-1 right-1 hidden size-4 place-items-center px-0 text-fg",
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
export const PickedTray = ({ picked, onRemove, onEmptied }: TrayProps) => (
	<div className="space-y-1.5">
		<div className={SECTION_LABEL}>Picked · {picked.length}</div>
		{picked.length ? (
			<ul className="flex h-24 gap-2 overflow-x-auto overflow-y-hidden p-0.5 [scrollbar-width:thin]">
				{picked.map(([set, folder]) => (
					<Tile key={set} set={set} folder={folder} onRemove={onRemove} onEmptied={onEmptied} />
				))}
			</ul>
		) : (
			<div className="grid h-24 place-items-center rounded-md border border-dashed border-line-strong text-fg-2 text-secondary">
				Picked sets show here
			</div>
		)}
	</div>
);
