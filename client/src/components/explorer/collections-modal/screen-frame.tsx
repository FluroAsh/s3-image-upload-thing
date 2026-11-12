import { LucideArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
	/** Name of the screen, also the dialog's accessible title. */
	title: string;
	/** Mono detail after the title, such as the bucket or a slug. */
	subtitle?: string;
	/** Shows a back button that runs this; the first screen has none. */
	onBack?: () => void;
	/** Label for the back button, naming where it goes. */
	backLabel?: string;
	/** Actions at the right of the header, before the dialog's close button. */
	children?: React.ReactNode;
};

export const ScreenHeader = ({ title, subtitle, onBack, backLabel = "Back", children }: ScreenHeaderProps) => (
	<DialogHeader className={cn(onBack && "pl-2")}>
		{onBack && (
			<Button variant="icon" aria-label={backLabel} onClick={onBack}>
				<LucideArrowLeft className="size-3.5" />
			</Button>
		)}
		<DialogTitle>{title}</DialogTitle>
		{subtitle && <span className="truncate font-mono text-secondary text-fg-2">{subtitle}</span>}
		<div className="ml-auto flex items-center gap-1">{children}</div>
	</DialogHeader>
);

export const ScreenFooter = ({ info, children }: { info?: React.ReactNode; children: React.ReactNode }) => (
	<DialogFooter>
		<span className="mr-auto truncate font-mono text-secondary text-fg-2">{info}</span>
		{children}
	</DialogFooter>
);
