import { useId } from "react";

import { LucideAlertTriangle } from "lucide-react";

type FieldProps = {
	label: string;
	/** Replaces the hint and marks the input invalid. */
	error?: string;
	/** Muted line under the input while there is no error. */
	hint?: string;
	/** Renders the input; spread the props onto it so the label and note are wired up. */
	children: (props: { id: string; invalid: boolean; "aria-describedby"?: string }) => React.ReactNode;
};

/** A labelled input with its error or hint line underneath. */
export const Field = ({ label, error, hint, children }: FieldProps) => {
	const id = useId();
	const noteId = useId();

	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="block text-caption text-fg-2">
				{label}
			</label>
			{children({ id, invalid: !!error, "aria-describedby": error || hint ? noteId : undefined })}
			{error ? (
				<p id={noteId} className="flex items-start gap-1.5 text-caption text-err">
					<LucideAlertTriangle className="mt-px size-3 shrink-0" />
					{error}
				</p>
			) : (
				hint && (
					<p id={noteId} className="text-caption text-fg-2">
						{hint}
					</p>
				)
			)}
		</div>
	);
};
