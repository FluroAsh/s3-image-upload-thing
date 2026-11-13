import * as React from "react";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/** `actions` sit at the right of the tab row, so a tab's section actions line up with its label. */
const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { actions?: React.ReactNode }
>(({ className, actions, ...props }, ref) => (
	<div className="flex items-end justify-between gap-3 border-b border-line">
		<TabsPrimitive.List ref={ref} className={cn("-mb-px flex items-end gap-4", className)} {...props} />
		{actions && <div className="flex items-center gap-2 pb-1.5">{actions}</div>}
	</div>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			"inline-flex h-8 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent text-body text-fg-2 transition-colors duration-100 hover:text-fg-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[state=active]:border-accent data-[state=active]:font-medium data-[state=active]:text-fg",
			className,
		)}
		{...props}
	/>
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content ref={ref} className={cn("pt-3 outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
