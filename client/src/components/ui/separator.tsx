import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorOrientation = "horizontal" | "vertical";

interface SeparatorProps extends React.ComponentPropsWithoutRef<"hr"> {
	orientation?: SeparatorOrientation;
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
	({ orientation = "horizontal", className, ...props }, ref) => (
		<hr
			ref={ref}
			aria-orientation={orientation}
			className={cn(
				"shrink-0 bg-neutral-700",
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
