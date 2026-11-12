import * as React from "react";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { LucideCheck, LucideChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuSub = ContextMenuPrimitive.Sub;

const SURFACE =
	"z-50 min-w-40 rounded-lg border border-line-strong bg-panel p-1 text-fg shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const ContextMenuContent = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
	<ContextMenuPrimitive.Portal>
		<ContextMenuPrimitive.Content ref={ref} className={cn(SURFACE, className)} {...props} />
	</ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = "ContextMenuContent";

export const ContextMenuSubContent = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<ContextMenuPrimitive.Portal>
		<ContextMenuPrimitive.SubContent ref={ref} className={cn(SURFACE, className)} {...props} />
	</ContextMenuPrimitive.Portal>
));
ContextMenuSubContent.displayName = "ContextMenuSubContent";

const ITEM =
	"flex h-6 cursor-pointer select-none items-center gap-3 rounded-sm px-2 text-body outline-none transition-colors duration-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-pressed data-[state=open]:bg-pressed";

type ItemProps = React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
	/** Right-aligned mono text, such as a size or a key. */
	meta?: React.ReactNode;
	/** Draws the item in the error colour, for the one action that removes something. */
	danger?: boolean;
	/** Ticks the item, for the option that is already chosen. */
	checked?: boolean;
};

export const ContextMenuItem = React.forwardRef<React.ElementRef<typeof ContextMenuPrimitive.Item>, ItemProps>(
	({ className, meta, danger, checked, children, asChild, ...props }, ref) => (
		<ContextMenuPrimitive.Item
			ref={ref}
			asChild={asChild}
			className={cn(ITEM, danger && "text-err", className)}
			{...props}
		>
			{asChild ? (
				children
			) : (
				<>
					<span className="min-w-0 flex-1 truncate">{children}</span>
					{meta !== undefined && <span className="font-mono text-caption text-fg-2">{meta}</span>}
					{checked && <LucideCheck aria-label="Current" className="size-3.5 shrink-0" />}
				</>
			)}
		</ContextMenuPrimitive.Item>
	),
);
ContextMenuItem.displayName = "ContextMenuItem";

export const ContextMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
	<ContextMenuPrimitive.SubTrigger ref={ref} className={cn(ITEM, className)} {...props}>
		<span className="min-w-0 flex-1 truncate">{children}</span>
		<LucideChevronRight className="size-3 shrink-0 text-fg-2" />
	</ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

export const ContextMenuSeparator = ({ className, ...props }: React.ComponentProps<"div">) => (
	<ContextMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />
);
