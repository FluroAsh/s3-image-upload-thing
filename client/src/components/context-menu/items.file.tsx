import { ContextMenuSeparator } from "../ui/context-menu";
import { DeleteMenuItem, DownloadMenuItem, OpenMenuItem, RenameMenuItem } from "./items.actions";

type FileContextMenuItemsProps = {
	previewUrl?: string;
};

export const FileContextMenuItems = ({ previewUrl }: FileContextMenuItemsProps) => (
	<>
		<OpenMenuItem url={previewUrl} />
		<DownloadMenuItem />
		<RenameMenuItem />
		<ContextMenuSeparator />
		<DeleteMenuItem />
	</>
);
