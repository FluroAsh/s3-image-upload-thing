import { LucideImages } from "lucide-react";

import { useSetSelection } from "@/hooks/useSetSelection";

import { setPathOf } from "../utils";
import { NodeName, TreeRow } from "./row";
import type { NodeProps } from "./types";

export const SetNode = ({ row, query, tabbable, onFocus }: NodeProps) => {
	const { node, variants } = row;
	const { isActive, select } = useSetSelection({ setPath: setPathOf(node.id), name: node.name, variants });

	return (
		<TreeRow
			id={node.id}
			depth={node.depth}
			selected={isActive}
			tabbable={tabbable}
			meta={variants.length}
			onActivate={select}
			onFocus={onFocus}
		>
			<LucideImages className="size-4 shrink-0 text-accent" />
			<NodeName name={node.name} query={query} />
		</TreeRow>
	);
};
