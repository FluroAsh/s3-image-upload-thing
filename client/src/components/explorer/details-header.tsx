import { useEffect, useState } from "react";

import { LucideCheck, LucideCopy, LucideExternalLink, LucideX } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { SetBadge } from "./set-badge";

const COPIED_MS = 1500;

const CopyUrlButton = ({ url }: { url: string }) => {
	const [result, setResult] = useState<"copied" | "failed" | null>(null);

	useEffect(() => {
		if (!result) return;
		const timer = setTimeout(() => setResult(null), COPIED_MS);
		return () => clearTimeout(timer);
	}, [result]);

	const Icon = result === "copied" ? LucideCheck : result === "failed" ? LucideX : LucideCopy;

	return (
		<Button
			variant="ghost"
			disabled={!url}
			onClick={() =>
				navigator.clipboard.writeText(url).then(
					() => setResult("copied"),
					() => setResult("failed"),
				)
			}
		>
			<Icon className="size-3.5" />
			{result === "copied" ? "Copied" : result === "failed" ? "Copy failed" : "Copy URL"}
		</Button>
	);
};

export const DetailsHeader = ({
	name,
	folder,
	url,
	publicUrl,
	set,
}: {
	name: string;
	folder: string;
	url: string;
	publicUrl: string;
	set?: string;
}) => (
	<header className="flex h-topbar shrink-0 items-center gap-2 border-b border-line px-3">
		<h2 className="truncate font-mono text-body font-medium text-fg">{name}</h2>
		{folder && <span className="truncate font-mono text-secondary text-fg-2">{folder}</span>}
		{set && <SetBadge set={set} />}
		<div className="ml-auto flex shrink-0 items-center gap-1">
			{url ? (
				<a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost" })}>
					<LucideExternalLink className="size-3.5" />
					Open
				</a>
			) : (
				<Button variant="ghost" disabled>
					<LucideExternalLink className="size-3.5" />
					Open
				</Button>
			)}
			<CopyUrlButton key={publicUrl} url={publicUrl} />
		</div>
	</header>
);
