import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, usePresignedUrls } from "@/lib/query";

import { openFile, publicUrlOf } from "../file-actions";
import type { TreeRowData } from "../tree-rows";
import type { CollectionAssign } from "../use-collection-move";
import { pickPreviewVariant, setFoldersUnder, setPathOf, sizeRank, variantOf } from "../utils";
import { CollectionSubmenu, CopyItem } from "./menu-parts";

const OPEN_KEY = "⏎";

type MenuProps = {
	row: TreeRowData;
	onOpen: () => void;
};

export const SetMenu = ({ row, onOpen, assign }: MenuProps & { assign: CollectionAssign }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { node, variants } = row;
	const { data: urls = {} } = usePresignedUrls(
		variants.map(({ id }) => id),
		bucketName,
		bucketRegion,
	);
	const preview = pickPreviewVariant(variants);

	return (
		<>
			<ContextMenuItem meta={OPEN_KEY} onSelect={onOpen}>
				Open
			</ContextMenuItem>
			{variants.length > 0 && (
				<ContextMenuSub>
					<ContextMenuSubTrigger>Download</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{variants
							.toSorted((a, b) => sizeRank(variantOf(b.name)) - sizeRank(variantOf(a.name)))
							.map(({ id, name, size }) => (
								<ContextMenuItem key={id} meta={size} disabled={!urls[id]} onSelect={() => openFile(urls[id])}>
									{variantOf(name)}
								</ContextMenuItem>
							))}
					</ContextMenuSubContent>
				</ContextMenuSub>
			)}
			<CopyItem label="Copy public URL" text={preview && urls[preview.id] && publicUrlOf(urls[preview.id])} />
			<ContextMenuSeparator />
			<CollectionSubmenu label="Add to collection…" sets={[setPathOf(node.id)]} assign={assign} removable />
		</>
	);
};

export const FileMenu = ({ row, onOpen }: MenuProps) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { node } = row;
	const url = usePresignedUrls([node.id], bucketName, bucketRegion).data?.[node.id];

	return (
		<>
			<ContextMenuItem meta={OPEN_KEY} onSelect={onOpen}>
				Open
			</ContextMenuItem>
			<ContextMenuItem meta={node.size} disabled={!url} onSelect={() => url && openFile(url)}>
				Download
			</ContextMenuItem>
			<CopyItem label="Copy public URL" text={url && publicUrlOf(url)} />
		</>
	);
};

export const FolderMenu = ({
	row,
	onToggle,
	assign,
}: {
	row: TreeRowData;
	onToggle: () => void;
	assign: CollectionAssign;
}) => {
	const {
		actions: { setAttentionFolder },
		state: { bucketName, bucketRegion },
	} = useExplorer();
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const sets = setFoldersUnder(childMap, row.node.id).map(({ id }) => setPathOf(id));

	return (
		<>
			<ContextMenuItem meta={row.expanded ? "←" : "→"} onSelect={onToggle}>
				{row.expanded ? "Collapse" : "Expand"}
			</ContextMenuItem>
			<CopyItem label="Copy path" text={setPathOf(row.node.id)} />
			<ContextMenuItem onSelect={() => setAttentionFolder(setPathOf(row.node.id))}>
				Show sets needing attention
			</ContextMenuItem>
			{sets.length > 0 && (
				<>
					<ContextMenuSeparator />
					<CollectionSubmenu
						label={`Add ${sets.length} ${sets.length === 1 ? "set" : "sets"} to collection…`}
						sets={sets}
						assign={assign}
					/>
				</>
			)}
		</>
	);
};
