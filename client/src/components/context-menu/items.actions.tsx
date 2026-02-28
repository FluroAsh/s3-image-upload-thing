// UI Primitives, the components accept logic handlers as props

import {
	LucideArchive,
	LucideDownload,
	LucideExternalLink,
	LucideImage,
	LucidePencil,
	LucideTrash,
} from "lucide-react";

import { IMAGE_VARIANT_ORDER } from "~/shared/types/image";

import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "../ui/context-menu";

// ---- Common ContextMenu Actions ---- //
export const DeleteMenuItem = () => (
	<ContextMenuItem>
		<LucideTrash className="size-4 mr-2 stroke-red-500 flex-shrink-0" />
		<span className="text-red-500">Delete</span>
	</ContextMenuItem>
);

export const RenameMenuItem = () => (
	<ContextMenuItem>
		<LucidePencil className="size-4 mr-2 stroke-neutral-100 flex-shrink-0" />
		<span className="text-neutral-100">Rename</span>
	</ContextMenuItem>
);

export const DownloadMenuItem = () => (
	<ContextMenuItem>
		<LucideDownload className="size-4 mr-2 stroke-sky-500 flex-shrink-0" />
		<span className="text-sky-500">Download</span>
	</ContextMenuItem>
);

export const OpenMenuItem = ({ url }: { url?: string }) => (
	<ContextMenuItem disabled={!url} onSelect={() => url && window.open(url, "_blank")}>
		<LucideExternalLink className="size-4 mr-2 stroke-neutral-100 flex-shrink-0" />
		<span className="text-neutral-100">Open</span>
	</ContextMenuItem>
);

// ----  Download Variants Sub Menu ---- //
export type DownloadVariant = {
	id: string;
	label: string;
	size?: string;
	url?: string;
};

const sortByVariantOrder = (a: DownloadVariant, b: DownloadVariant) => {
	const aIndex = IMAGE_VARIANT_ORDER.indexOf(a.label.toLowerCase() as (typeof IMAGE_VARIANT_ORDER)[number]);
	const bIndex = IMAGE_VARIANT_ORDER.indexOf(b.label.toLowerCase() as (typeof IMAGE_VARIANT_ORDER)[number]);
	return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
};

export const DownloadSubMenu = ({ variants }: { variants: DownloadVariant[] }) => {
	const sorted = [...variants].sort(sortByVariantOrder);

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger className="[&>svg]:stroke-sky-500">
				<LucideDownload className="size-4 mr-2 stroke-sky-500 flex-shrink-0" />
				<span className="text-sky-500">Download</span>
			</ContextMenuSubTrigger>

			<ContextMenuSubContent>
				<ContextMenuItem disabled>
					<LucideArchive className="size-4 mr-2 stroke-neutral-100 flex-shrink-0" />
					<span className="text-neutral-100">Download all (ZIP)</span>
				</ContextMenuItem>

				<ContextMenuSeparator />
				{sorted.map((variant) => (
					<ContextMenuItem
						key={variant.id}
						disabled={!variant.url}
						onSelect={() => variant.url && window.open(variant.url, "_blank")}
					>
						<LucideImage className="size-4 mr-2 stroke-neutral-100 flex-shrink-0" />
						<span className="text-neutral-100 capitalize">{variant.label}</span>
						{variant.size && <span className="ml-auto pl-4 text-xs text-slate-400">{variant.size}</span>}
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
};
