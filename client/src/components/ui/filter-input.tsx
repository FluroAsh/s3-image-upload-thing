import * as React from "react";

import { LucideSearch, LucideXCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
	/** Classes for the box around the icon and field, e.g. its width. */
	wrapperClassName?: string;
	/** Shows a clear button while the field has text; it runs this, and the caller restores focus. */
	onClear?: () => void;
};

export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
	({ wrapperClassName, className, onClear, ...props }, ref) => (
		<div className={cn("relative", wrapperClassName)}>
			<LucideSearch
				aria-hidden
				className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-fg-2"
			/>
			<Input
				ref={ref}
				type="search"
				className={cn("pl-6 [&::-webkit-search-cancel-button]:hidden", onClear && "pr-7", className)}
				{...props}
			/>
			{onClear && props.value && (
				<Button
					variant="icon"
					aria-label="Clear filter"
					tabIndex={-1}
					className="absolute right-0.5 top-1/2 size-6 -translate-y-1/2"
					onClick={onClear}
				>
					<LucideXCircle className="size-3.5" />
				</Button>
			)}
		</div>
	),
);
FilterInput.displayName = "FilterInput";
