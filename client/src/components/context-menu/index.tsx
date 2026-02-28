import { ContextMenuContent, ContextMenu as ContextMenuPrimitive, ContextMenuTrigger } from "../ui/context-menu";

type ContextMenuVariantType = "file" | "folder" | "image-collection";
type ContextMenuProps = {
	variant: ContextMenuVariantType;
	children: React.ReactNode;
	items: React.ReactNode;
};

// Variant to be used later for conditional rendering/logic
export const ContextMenu = ({ variant: _variant, children, items }: ContextMenuProps) => {
	return (
		<ContextMenuPrimitive>
			<ContextMenuTrigger>{children}</ContextMenuTrigger>
			<ContextMenuContent>{items}</ContextMenuContent>
		</ContextMenuPrimitive>
	);
};
