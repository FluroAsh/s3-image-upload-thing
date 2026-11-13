import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { LucideLoader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
	"inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-body font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-45 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent",
	{
		variants: {
			variant: {
				primary: "h-control bg-fg px-2.5 text-canvas hover:bg-white",
				default: "h-control border border-line-strong bg-raised px-2.5 text-fg hover:bg-pressed",
				ghost:
					"h-control px-2.5 text-fg hover:bg-raised aria-[current=page]:pointer-events-none aria-[current=page]:bg-pressed",
				icon: "size-control text-fg-1 hover:bg-raised hover:text-fg",
			},
			danger: { true: "text-err hover:text-err" },
		},
		defaultVariants: { variant: "default" },
	},
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
	VariantProps<typeof buttonVariants> & {
		/** Shows a spinner and disables the button; pass the "...ing" label as the children. */
		pending?: boolean;
	};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ variant, danger, pending = false, className, type = "button", disabled, children, ...props }, ref) => (
		<button
			ref={ref}
			type={type}
			disabled={disabled || pending}
			aria-busy={pending || undefined}
			className={cn(buttonVariants({ variant, danger }), className)}
			{...props}
		>
			{pending && <LucideLoader2 aria-hidden className="size-3.5 animate-spin" />}
			{children}
		</button>
	),
);
Button.displayName = "Button";
