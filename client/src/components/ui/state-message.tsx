import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
	neutral: { circle: "bg-neutral-800/50", icon: "stroke-neutral-400", message: "text-slate-400" },
	info: { circle: "bg-sky-500/10", icon: "stroke-sky-400", message: "text-slate-400" },
	error: { circle: "bg-red-500/10", icon: "stroke-red-500", message: "text-red-500" },
} as const;

const SIZES = {
	sm: { container: "p-12 h-full", circle: "size-12 mb-3", icon: "size-5" },
	lg: { container: "p-8", circle: "size-16 mb-4", icon: "size-8" },
} as const;

type StateMessageProps = {
	/** Icon drawn in the circle. */
	icon: LucideIcon;
	/** Headline, or the whole message for a bare state such as loading. */
	title: string;
	/** Detail under the title; leave out when the title says it all. */
	message?: string;
	/** Colours the circle and icon, and the message when `"error"`. Defaults to `"neutral"`. */
	tone?: keyof typeof TONES;
	/** `"sm"` fills a narrow column such as the bucket list; `"lg"` suits a wide panel. Defaults to `"lg"`. */
	size?: keyof typeof SIZES;
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
}: StateMessageProps) => (
	<div
		className={cn(
			"flex flex-col items-center justify-center text-center text-balance",
			SIZES[size].container,
			className,
		)}
	>
		<div className={cn("rounded-full flex items-center justify-center", TONES[tone].circle, SIZES[size].circle)}>
			<Icon className={cn(TONES[tone].icon, SIZES[size].icon, spin && "animate-spin")} />
		</div>
		<h3 className="text-sm font-medium text-neutral-100">{title}</h3>
		{message && <p className={cn("mt-2 text-xs max-w-xs", TONES[tone].message)}>{message}</p>}
	</div>
);
