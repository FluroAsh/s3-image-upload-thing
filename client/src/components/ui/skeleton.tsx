import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => (
	<span aria-hidden className={cn("inline-block h-3 animate-pulse rounded-sm bg-raised", className)} />
);
