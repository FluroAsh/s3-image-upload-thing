import { useId, useState } from "react";

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
import { Input } from "@/components/ui/input";

type PromptDialogProps = {
	/** Whether the dialog is shown. */
	open: boolean;
	/** Called with `false` when the user cancels, presses Escape or clicks outside. */
	onOpenChange: (open: boolean) => void;
	/** What is being named, e.g. "Rename collection". */
	title: string;
	/** Mono text beside the title for context, e.g. the destination folder. */
	subtitle?: string;
	/** Label above the field. */
	label: string;
	/** Text the field starts with. Defaults to empty. */
	initialValue?: string;
	/** Muted line under the field while there is no error; a function receives the trimmed value. */
	hint?: string | ((value: string) => string);
	/** Label of the submit button. */
	confirmLabel: string;
	/** Label of the submit button while `pending`, e.g. "Renaming...". Defaults to `confirmLabel`. */
	pendingLabel?: string;
	/** Locks the field and disables the buttons while the mutation runs; the field stays focusable so Enter retries after an error. */
	pending?: boolean;
	/** Server error shown under the field; the submit button then reads "Retry". */
	error?: string;
	/** Returns the reason the value is not acceptable, or `undefined` when it is; a rejected value disables submit. */
	validate?: (value: string) => string | undefined;
	/** Receives the trimmed value; the caller closes the dialog when it succeeds. */
	onSubmit: (value: string) => void;
};

const PromptForm = ({
	onOpenChange,
	label,
	initialValue = "",
	hint,
	confirmLabel,
	pendingLabel = confirmLabel,
	pending = false,
	error,
	validate,
	onSubmit,
}: Omit<PromptDialogProps, "open" | "title" | "subtitle">) => {
	const [value, setValue] = useState(initialValue);
	const trimmed = value.trim();
	const invalidReason = trimmed ? validate?.(trimmed) : undefined;
	const shownError = invalidReason ?? error;
	const shownHint = typeof hint === "function" ? (trimmed ? hint(trimmed) : undefined) : hint;
	const inputId = useId();
	const errorId = useId();

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!pending && trimmed && !invalidReason) onSubmit(trimmed);
			}}
		>
			<div className="space-y-1.5 px-4 py-3">
				<label htmlFor={inputId} className="block text-caption text-fg-2">
					{label}
				</label>
				<Input
					id={inputId}
					autoFocus
					className="mt-1"
					value={value}
					invalid={!!shownError}
					aria-describedby={shownError ? errorId : undefined}
					readOnly={pending}
					onChange={(event) => setValue(event.target.value)}
				/>
				{shownError ? (
					<p id={errorId} className="flex items-start gap-1.5 text-caption text-err">
						<LucideAlertTriangle className="mt-px size-3 shrink-0" />
						{shownError}
					</p>
				) : (
					shownHint && <p className="text-caption text-fg-2">{shownHint}</p>
				)}
			</div>
			<DialogFooter>
				<Button disabled={pending} onClick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" pending={pending} disabled={!trimmed || !!invalidReason}>
					{pending ? pendingLabel : error && !invalidReason ? "Retry" : confirmLabel}
				</Button>
			</DialogFooter>
		</form>
	);
};

/** A one-field form; the field lives inside the dialog content so it resets each time the dialog closes. */
export const PromptDialog = ({ open, onOpenChange, title, subtitle, ...form }: PromptDialogProps) => (
	<Dialog open={open} onOpenChange={(next) => !form.pending && onOpenChange(next)}>
		<DialogContent size="small" showClose={false} {...(subtitle ? {} : { "aria-describedby": undefined })}>
			<DialogHeader className="pr-4">
				<DialogTitle>{title}</DialogTitle>
				{subtitle && <DialogDescription className="font-mono text-secondary text-fg-2">{subtitle}</DialogDescription>}
			</DialogHeader>
			<PromptForm onOpenChange={onOpenChange} {...form} />
		</DialogContent>
	</Dialog>
);
