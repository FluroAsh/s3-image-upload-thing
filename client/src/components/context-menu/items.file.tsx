import { ContextMenuSeparator } from "../ui/context-menu";
import { DeleteMenuItem, DownloadMenuItem, RenameMenuItem } from "./items.actions";

export const FileContextMenuItems = () => {
	return (
		<>
			<DownloadMenuItem />
			<RenameMenuItem />
			<ContextMenuSeparator />
			<DeleteMenuItem />
		</>
	);
};
