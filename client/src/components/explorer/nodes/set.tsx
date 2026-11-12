import { LucideImages } from "lucide-react";

import { useSetSelection } from "@/hooks/useSetSelection";

import { setPathOf } from "../utils";
import { SetMenu } from "./menus";
import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

export const SetNode = ({ row, query, tabbable, onFocus, assign }: NodeProps) => {
	const { node, variants } = row;
	const { isActive, select } = useSetSelection(setPathOf(node.id));

	return (
		<TreeRow
			id={node.id}
			depth={node.depth}
			selected={isActive}
			tabbable={tabbable}
			meta={variants.length}
			menu={<SetMenu row={row} onOpen={select} assign={assign} />}
			onActivate={select}
			onFocus={onFocus}
		>
			<LucideImages className="size-4 shrink-0 text-accent" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
