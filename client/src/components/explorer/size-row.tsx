import { LucideCircleDashed, LucideExternalLink, LucideLoader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SizeStatus } from "~/shared/image-sizes";

import { formatBytes } from "./inspector";

const DOTS = { present: "bg-ok", mismatched: "bg-warn" } as const;

export const SizeRow = ({
	status: { name, state, variant, reason },
	href,
	generating,
	written,
}: {
	status: SizeStatus;
	href?: string;
	generating: boolean;
	written: boolean;
}) => {
	const missing = state === "missing";
	const body = (
		<>
			<span className={cn("font-mono", missing ? "text-fg-2" : "text-fg")}>{name}</span>
			<span className="truncate font-mono text-fg-1">
				{variant
					? `${variant.width}×${variant.height} · ${formatBytes(variant.bytes)}`
					: generating
						? "generating…"
						: "missing"}
			</span>
			<span className="flex items-center gap-1.5">
				{href && <LucideExternalLink className="hidden size-3 text-fg-1 group-hover:block group-focus-visible:block" />}
				{generating ? (
					<LucideLoader2 aria-label="Generating" className="size-3 animate-spin text-fg-2" />
				) : missing ? (
					<LucideCircleDashed aria-label="Missing" className="size-3 text-fg-2" />
				) : (
					<span
						role="img"
						aria-label={state === "mismatched" ? "Mismatched" : "Present"}
						className={cn("size-1.5 rounded-full", DOTS[state as keyof typeof DOTS])}
					/>
				)}
			</span>
		</>
	);
	const className = cn(
		"group grid h-control grid-cols-[theme(spacing.label)_1fr_auto] items-center gap-2 rounded-md px-1.5 text-secondary",
		written && "bg-ok/10",
		href && "hover:bg-raised",
	);

	return href ? (
		<a href={href} target="_blank" rel="noopener noreferrer" title={reason} className={className}>
			{body}
		</a>
	) : (
		<div title={reason} className={className}>
			{body}
		</div>
	);
};

export const Legend = ({ linked }: { linked: boolean }) => (
	<div className="mt-2 space-y-0.5 text-caption text-fg-2">
		<p className="flex items-center gap-3">
			<span className="flex items-center gap-1">
				<span className="size-1.5 rounded-full bg-ok" />
				present
			</span>
			<span className="flex items-center gap-1">
				<LucideCircleDashed className="size-3" />
				missing
			</span>
			<span className="flex items-center gap-1">
				<span className="size-1.5 rounded-full bg-warn" />
				mismatched
			</span>
		</p>
		{linked && <p>A row opens its file in a new tab</p>}
	</div>
);
