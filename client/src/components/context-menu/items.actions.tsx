// UI Primitives, the components accept logic handlers as props

import { LucideDownload, LucidePencil, LucideTrash } from "lucide-react";

import { ContextMenuItem } from "../ui/context-menu";

export const DeleteMenuItem = () => {
	return (
		<ContextMenuItem>
			<LucideTrash className="size-4 mr-2 stroke-red-500 flex-shrink-0" />
			<span className="text-red-500">Delete</span>
		</ContextMenuItem>
	);
};

export const RenameMenuItem = () => {
	return (
		<ContextMenuItem>
			<LucidePencil className="size-4 mr-2 stroke-neutral-100 flex-shrink-0" />
			<span className="text-neutral-100">Rename</span>
		</ContextMenuItem>
	);
};

export const DownloadMenuItem = () => {
	return (
		<ContextMenuItem>
			<LucideDownload className="size-4 mr-2 stroke-sky-500 flex-shrink-0" />
			<span className="text-sky-500">Download</span>
		</ContextMenuItem>
	);
};
