import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useCopy } from "@/hooks/useCopy";
import { useCollections } from "@/lib/query";
import { holdingSet } from "~/shared/collections";

import type { CollectionAssign } from "../use-collection-move";

/** Copies `text` and reads "Copied" for a moment; the menu stays open so the label is seen. */
export const CopyItem = ({ label, text }: { label: string; text: string | undefined }) => {
	const { result, copy } = useCopy();

	return (
		<ContextMenuItem
			disabled={!text}
			onSelect={(event) => {
				event.preventDefault();
				if (text) copy(text);
			}}
		>
			{result === "copied" ? "Copied" : result === "failed" ? "Copy failed" : label}
		</ContextMenuItem>
	);
};

type CollectionSubmenuProps = {
	/** Label of the submenu, e.g. "Add to collection…". */
	label: string;
	/** The sets the choice applies to. */
	sets: string[];
	/** Add, move and remove writes for `sets`. */
	assign: CollectionAssign;
	/** Offers "Remove from X" when `sets` is one set already in a collection. */
	removable?: boolean;
};

/** Collections to add the sets to, a tick on the one holding the set, then New collection… and Remove. */
export const CollectionSubmenu = ({ label, sets, assign, removable }: CollectionSubmenuProps) => {
	const { data } = useCollections();
	const held = removable ? holdingSet(data, sets[0])?.collection : undefined;

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger>{label}</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				{data?.collections.map(({ slug, name }) => (
					<ContextMenuItem
						key={slug}
						checked={held?.slug === slug}
						onSelect={() => held?.slug !== slug && assign.toCollection(sets, slug)}
					>
						{name}
					</ContextMenuItem>
				))}
				{data?.collections.length ? <ContextMenuSeparator /> : null}
				<ContextMenuItem onSelect={() => assign.toNew(sets)}>New collection…</ContextMenuItem>
				{held && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem danger onSelect={() => assign.toCollection(sets, null)}>
							Remove from {held.name}
						</ContextMenuItem>
					</>
				)}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
};
