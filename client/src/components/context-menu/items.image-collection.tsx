import { ContextMenuSeparator } from "../ui/context-menu";
import { DeleteMenuItem, DownloadSubMenu, type DownloadVariant } from "./items.actions";

type ImageCollectionContextMenuItemsProps = {
	variants: DownloadVariant[];
};

export const ImageCollectionContextMenuItems = ({ variants }: ImageCollectionContextMenuItemsProps) => (
	<>
		<DownloadSubMenu variants={variants} />
		<ContextMenuSeparator />
		<DeleteMenuItem />
	</>
);
