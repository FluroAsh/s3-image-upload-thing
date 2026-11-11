import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentPropsWithoutRef<"hr"> & {
	/** Direction of the rule. Defaults to `"horizontal"`. */
	orientation?: "horizontal" | "vertical";
};

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
	({ orientation = "horizontal", className, ...props }, ref) => (
		<hr
			ref={ref}
			aria-orientation={orientation}
			className={cn(
				"shrink-0 border-0 bg-line",
				orientation === "horizontal" && "h-px w-full",
				orientation === "vertical" && "h-full w-px",
				className,
			)}
			{...props}
		/>
	),
);

Separator.displayName = "Separator";

export { Separator };
