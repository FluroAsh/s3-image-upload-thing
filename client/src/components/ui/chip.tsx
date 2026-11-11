import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva("inline-flex h-chip items-center rounded-sm px-1.5 font-mono text-caption", {
	variants: {
		tone: {
			default: "bg-raised text-fg-1",
			missing: "border border-dashed border-line-strong text-fg-2",
			mismatched: "border border-warn/40 bg-warn/10 text-warn",
		},
	},
	defaultVariants: { tone: "default" },
});

type ChipProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof chipVariants>;

export const Chip = ({ tone, className, ...props }: ChipProps) => (
	<span className={cn(chipVariants({ tone }), className)} {...props} />
);
