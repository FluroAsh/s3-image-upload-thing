// UI Primitives, the components accept logic handlers as props

import { IMAGE_VARIANT_ORDER } from "~/shared/types/image";

import {
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "../ui/context-menu";

// ---- Common ContextMenu Actions ---- //
// Color is reserved for destructive actions only; everything else is neutral
export const DeleteMenuItem = () => (
	<ContextMenuItem className="text-red-400 focus:text-red-400">Delete</ContextMenuItem>
);

export const RenameMenuItem = () => <ContextMenuItem className="text-neutral-200">Rename</ContextMenuItem>;

export const DownloadMenuItem = () => <ContextMenuItem className="text-neutral-200">Download</ContextMenuItem>;

export const OpenMenuItem = ({ url }: { url?: string }) => (
	<ContextMenuItem disabled={!url} className="text-neutral-200" onSelect={() => url && window.open(url, "_blank")}>
		Open
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
			<ContextMenuSubTrigger className="text-neutral-200">Download</ContextMenuSubTrigger>

			<ContextMenuSubContent>
				<ContextMenuItem disabled className="text-neutral-500">
					Download all (ZIP)
				</ContextMenuItem>

				<ContextMenuSeparator />
				{sorted.map((variant) => (
					<ContextMenuItem
						key={variant.id}
						disabled={!variant.url}
						className="text-neutral-200"
						onSelect={() => variant.url && window.open(variant.url, "_blank")}
					>
						<span className="capitalize">{variant.label}</span>
						{variant.size && <span className="ml-auto shrink-0 pl-3 text-xs text-neutral-500">{variant.size}</span>}
					</ContextMenuItem>
				))}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
};
