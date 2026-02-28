import { ContextMenuSeparator } from "../ui/context-menu";
import { DeleteMenuItem, /* DownloadMenuItem,*/ RenameMenuItem } from "./items.actions";

export const FolderContextMenuItems = () => {
	return (
		<>
			<RenameMenuItem />
			{/* TODO:
			 * Download folder as a ZIP
			 * To do this efficiently we need to setup a background job to stream the files to the user
			 * before returning the final ZIP via a download link
			 */}
			{/* <DownloadMenuItem /> */}
			<ContextMenuSeparator />
			<DeleteMenuItem />
		</>
	);
};
