import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree, useManifest, usePresignedUrls } from "@/lib/query";

import { publicUrlOf, saveFile } from "../file-actions";
import { formatBytes } from "../inspector";
import type { TreeRowData } from "../tree-rows";
import type { CollectionAssign } from "../use-collection-move";
import { pickPreviewVariant, setFoldersIn, setPathOf, sizeRank, variantOf } from "../utils";
import { CollectionSubmenu, CopyItem } from "./menu-parts";

type MenuProps = {
	/** The row the menu belongs to. */
	row: TreeRowData;
	/** Opens the row in the details panel. */
	onOpen: () => void;
};

export const SetMenu = ({ row, onOpen, assign }: MenuProps & { assign: CollectionAssign }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { node, variants } = row;
	const preview = pickPreviewVariant(variants);
	const { data: urls = {} } = usePresignedUrls(preview ? [preview.id] : [], bucketName, bucketRegion);
	/** The tree leaves out a set's original, so its key comes from the manifest. */
	const source = useManifest(setPathOf(node.id)).data?.source;
	const location = { bucketName, bucketRegion };

	return (
		<>
			<ContextMenuItem onSelect={onOpen}>Open</ContextMenuItem>
			{(variants.length > 0 || source) && (
				<ContextMenuSub>
					<ContextMenuSubTrigger>Download</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{source && (
							<ContextMenuItem meta={formatBytes(source.bytes)} onSelect={() => saveFile(source.key, location)}>
								original
							</ContextMenuItem>
						)}
						{variants
							.toSorted((a, b) => sizeRank(variantOf(b.name)) - sizeRank(variantOf(a.name)))
							.map(({ id, name, size }) => (
								<ContextMenuItem key={id} meta={size} onSelect={() => saveFile(id, location)}>
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
			<ContextMenuItem onSelect={onOpen}>Open</ContextMenuItem>
			<ContextMenuItem meta={node.size} onSelect={() => saveFile(node.id, { bucketName, bucketRegion })}>
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
}: Omit<MenuProps, "onOpen"> & { onToggle: () => void; assign: CollectionAssign }) => {
	const {
		actions: { setAttentionFolder },
		state: { bucketName, bucketRegion },
	} = useExplorer();
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const sets = setFoldersIn(childMap, row.node.id).map(({ id }) => setPathOf(id));

	return (
		<>
			<ContextMenuItem onSelect={onToggle}>{row.expanded ? "Collapse" : "Expand"}</ContextMenuItem>
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
