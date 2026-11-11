import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared by `Input` and `Select` so both read as one control. */
export const FIELD_STYLE =
	"h-control w-full rounded-md border border-line-strong bg-raised px-2 text-body text-fg transition-colors duration-100 placeholder:text-fg-2 focus-visible:border-accent focus-visible:outline-none disabled:opacity-45 aria-[invalid=true]:border-err";

type InputProps = React.ComponentPropsWithoutRef<"input"> & {
	/** Draws the error border; the message itself is the caller's line under the field. */
	invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ invalid, className, ...props }, ref) => (
	<input ref={ref} aria-invalid={invalid || undefined} className={cn(FIELD_STYLE, className)} {...props} />
));
Input.displayName = "Input";
