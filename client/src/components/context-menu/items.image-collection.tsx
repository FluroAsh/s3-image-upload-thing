import { ContextMenuSeparator } from "../ui/context-menu";
import { DeleteMenuItem } from "./items.actions";

export const ImageCollectionContextMenuItems = () => {
	return (
		<>
			<DeleteMenuItem />
			{/* 1. TOOD: Allow downloading the entire collection as a ZIP */}
			{/* 2. TODO: Allow downloading a single image variant */}
		</>
	);
};
