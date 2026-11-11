import type * as React from "react";

import { LucideAlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StateMessage } from "@/components/ui/state-message";

type ConfirmDialogProps = {
	/** Whether the dialog is shown. */
	open: boolean;
	/** Called with `false` when the user cancels, presses Escape or clicks outside. */
	onOpenChange: (open: boolean) => void;
	/** Question the dialog asks, naming the thing it acts on. */
	title: string;
	/** What the action does and its consequences. */
	children: React.ReactNode;
	/** Label of the action button. */
	confirmLabel: string;
	/** Label of the action button while `pending`, e.g. "Deleting...". Defaults to `confirmLabel`. */
	pendingLabel?: string;
	/** Draws the action as a default button with red text instead of the white primary one. */
	destructive?: boolean;
	/** Disables both buttons and spins the action while the mutation runs. */
	pending?: boolean;
	/** Server error shown in the dialog; the action button then reads "Retry". */
	error?: string;
	/** Runs the action; the caller closes the dialog when it succeeds. */
	onConfirm: () => void;
};

/** A two-button question; focus starts on Cancel when `destructive`, so Enter never deletes by accident. */
export const ConfirmDialog = ({
	open,
	onOpenChange,
	title,
	children,
	confirmLabel,
	pendingLabel = confirmLabel,
	destructive = false,
	pending = false,
	error,
	onConfirm,
}: ConfirmDialogProps) => (
	<Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
		<DialogContent size="small" showClose={false}>
			<DialogHeader className="pr-4">
				<DialogTitle>{title}</DialogTitle>
			</DialogHeader>
			<div className="space-y-3 px-4 py-3">
				<DialogDescription asChild>
					<div>{children}</div>
				</DialogDescription>
				{error && (
					<StateMessage size="inline" tone="err" icon={LucideAlertTriangle} title="Could not finish" message={error} />
				)}
			</div>
			<DialogFooter>
				<Button disabled={pending} onClick={() => onOpenChange(false)} autoFocus={destructive}>
					Cancel
				</Button>
				<Button
					variant={destructive ? "default" : "primary"}
					danger={destructive}
					pending={pending}
					onClick={onConfirm}
					autoFocus={!destructive}
				>
					{pending ? pendingLabel : error ? "Retry" : confirmLabel}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
);
