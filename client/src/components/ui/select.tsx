import * as React from "react";

import { LucideChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { FIELD_STYLE } from "./input";

type SelectProps = React.ComponentPropsWithoutRef<"select"> & {
	/** Draws the error border; the message itself is the caller's line under the field. */
	invalid?: boolean;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ invalid, className, ...props }, ref) => (
	<div className="relative">
		<select
			ref={ref}
			aria-invalid={invalid || undefined}
			className={cn(FIELD_STYLE, "appearance-none pr-7", className)}
			{...props}
		/>
		<LucideChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-fg-2" />
	</div>
));
Select.displayName = "Select";
