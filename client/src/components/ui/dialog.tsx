"use client";

import * as React from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LucideX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-50 bg-canvas/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const CONTENT_SIZES = {
	small: "max-w-[420px]",
	default: "max-w-[720px]",
	wide: "max-w-[860px]",
} as const;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	/** Width of the dialog: `"small"` for confirm and prompt, `"wide"` for the collections modal. Defaults to `"default"`. */
	size?: keyof typeof CONTENT_SIZES;
	/** Shows the corner close button; turn off for dialogs that close from their footer. */
	showClose?: boolean;
	/** Greys the close button out while the dialog cannot be dismissed. */
	closeDisabled?: boolean;
};

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
	({ className, children, size = "default", showClose = true, closeDisabled = false, ...props }, ref) => (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn(
					"fixed left-[50%] top-[50%] z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border border-line bg-panel text-fg shadow-xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					CONTENT_SIZES[size],
					className,
				)}
				{...props}
			>
				{children}
				{showClose && (
					<div className="absolute right-2 top-0 flex h-10 items-center">
						<DialogPrimitive.Close asChild>
							<Button variant="icon" disabled={closeDisabled}>
								<LucideX className="size-3.5" />
								<span className="sr-only">Close</span>
							</Button>
						</DialogPrimitive.Close>
					</div>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	),
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex h-10 shrink-0 items-center gap-3 border-b border-line pl-4 pr-12", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex h-11 shrink-0 items-center justify-end gap-2 border-t border-line bg-canvas px-3", className)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title ref={ref} className={cn("text-body font-semibold", className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description ref={ref} className={cn("text-body text-fg-1", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogBody,
	DialogFooter,
	DialogTitle,
	DialogDescription,
};
