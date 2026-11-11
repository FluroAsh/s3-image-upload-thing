import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex h-chip items-center gap-1.5 rounded-full px-2 text-caption", {
	variants: {
		tone: {
			neutral: "bg-raised text-fg-1",
			ok: "bg-ok/10 text-ok",
			warn: "bg-warn/10 text-warn",
			err: "bg-err/10 text-err",
		},
	},
	defaultVariants: { tone: "neutral" },
});

type BadgeProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export const Badge = ({ tone, className, children, ...props }: BadgeProps) => (
	<span className={cn(badgeVariants({ tone }), className)} {...props}>
		<span aria-hidden className="size-1.5 rounded-full bg-current" />
		{children}
	</span>
);
