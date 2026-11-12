import * as React from "react";

import { LucideSearch } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
	/** Classes for the box around the icon and field, e.g. its width. */
	wrapperClassName?: string;
};

export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
	({ wrapperClassName, className, ...props }, ref) => (
		<div className={cn("relative", wrapperClassName)}>
			<LucideSearch
				aria-hidden
				className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-fg-2"
			/>
			<Input ref={ref} className={cn("pl-6", className)} {...props} />
		</div>
	),
);
FilterInput.displayName = "FilterInput";
