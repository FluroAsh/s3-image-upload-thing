import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorOrientation = "horizontal" | "vertical";

interface SeparatorProps extends React.ComponentPropsWithoutRef<"div"> {
  orientation?: SeparatorOrientation;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = "horizontal", className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-neutral-700",
        orientation === "horizontal" && "h-px w-full",
        orientation === "vertical" && "h-full w-px",
        className
      )}
      {...props}
    />
  )
);

Separator.displayName = "Separator";

export { Separator };
