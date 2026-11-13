import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRestoreFocus } from "@/components/ui/use-restore-focus";

type FormDialogProps = {
	/** Whether the dialog is shown. */
	open: boolean;
	/** Called with `false` when the user cancels, presses Escape or clicks outside; never while `pending`. */
	onOpenChange: (open: boolean) => void;
	title: string;
	/** Mono text beside the title for context, e.g. a masked URL. */
	subtitle?: string;
	/** Blocks Escape and outside clicks while a save runs. */
	pending?: boolean;
	/** The form; put it inside so its fields reset each time the dialog closes. */
	children: React.ReactNode;
};

/** The small dialog shell shared by the one-field and two-field forms. */
export const FormDialog = ({ open, onOpenChange, title, subtitle, pending = false, children }: FormDialogProps) => {
	const restoreFocus = useRestoreFocus(open);

	return (
		<Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
			<DialogContent
				size="small"
				showClose={false}
				onCloseAutoFocus={restoreFocus}
				{...(subtitle ? {} : { "aria-describedby": undefined })}
			>
				<DialogHeader className="pr-4">
					<DialogTitle>{title}</DialogTitle>
					{subtitle && (
						<DialogDescription className="min-w-0 truncate font-mono text-secondary text-fg-2">
							{subtitle}
						</DialogDescription>
					)}
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
};
