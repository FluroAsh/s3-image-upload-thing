import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
	neutral: { icon: "text-fg-2", message: "text-fg-1", bar: "bg-raised text-fg-1" },
	err: { icon: "text-err", message: "text-err", bar: "bg-err/10 text-err" },
	ok: { icon: "text-ok", message: "text-ok", bar: "bg-ok/10 text-ok" },
} as const;

const BLOCK_SIZES = {
	sm: { container: "h-full p-6", icon: "mb-2 size-4" },
	lg: { container: "p-8", icon: "mb-3 size-5" },
} as const;

type StateMessageProps = {
	/** Icon shown above the title, or at the start of the notice bar. */
	icon: LucideIcon;
	/** Headline, or the whole message for a bare state such as loading. */
	title: string;
	/** Detail under the title; leave out when the title says it all. */
	message?: string;
	/** Colours the icon and, for `"err"` and `"ok"`, the message. Defaults to `"neutral"`. */
	tone?: keyof typeof TONES;
	/** `"sm"` fills a narrow column, `"lg"` a wide panel, and `"inline"` is a notice bar above content. Defaults to `"lg"`. */
	size?: keyof typeof BLOCK_SIZES | "inline";
	/** Makes the icon spin, for a state that is still working. */
	spin?: boolean;
	/** Extra classes for the container, e.g. to fill a parent. */
	className?: string;
};

/** The one empty, loading and error state, so a panel's states look alike. */
export const StateMessage = ({
	icon: Icon,
	title,
	message,
	tone = "neutral",
	size = "lg",
	spin = false,
	className,
}: StateMessageProps) => {
	const { icon, message: messageTone, bar } = TONES[tone];

	if (size === "inline") {
		return (
			<div className={cn("flex items-start gap-2 rounded-md px-2 py-1.5 text-secondary", bar, className)}>
				<Icon className={cn("mt-0.5 size-3.5 shrink-0", spin && "animate-spin")} />
				<p>
					<span className={cn("font-medium", tone === "neutral" && "text-fg")}>
						{title}
						{message && "."}
					</span>
					{message && <span> {message}</span>}
				</p>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center text-balance text-center",
				BLOCK_SIZES[size].container,
				className,
			)}
		>
			<Icon className={cn(icon, BLOCK_SIZES[size].icon, spin && "animate-spin")} />
			<h3 className="text-body font-medium text-fg">{title}</h3>
			{message && <p className={cn("mt-1 max-w-xs text-secondary", messageTone)}>{message}</p>}
		</div>
	);
};
