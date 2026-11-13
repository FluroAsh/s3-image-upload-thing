import { useId, useState } from "react";

import { LucideAlertTriangle } from "lucide-react";

import { serverErrorMessage } from "@/components/explorer/utils";
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
import { StateMessage } from "@/components/ui/state-message";
import { useRestoreFocus } from "@/components/ui/use-restore-focus";
import { useAddHook, useUpdateHook } from "@/lib/query";
import type { DeployHook } from "~/shared/types";

/** Mirrors the server, which also allows plain `http://localhost` outside production. */
const isHookUrl = (value: string) => {
	const url = URL.parse(value);
	return (
		!!url &&
		(url.protocol === "https:" ||
			(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost"))
	);
};

const Field = ({
	label,
	error,
	hint,
	children,
}: {
	label: string;
	error?: string;
	hint?: string;
	children: (props: { id: string; invalid: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) => {
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

const HookForm = ({ hook, onClose }: { hook?: DeployHook; onClose: () => void }) => {
	const add = useAddHook();
	const update = useUpdateHook();
	const mutation = hook ? update : add;
	const [name, setName] = useState(hook?.name ?? "");
	const [url, setUrl] = useState("");
	const [urlTouched, setUrlTouched] = useState(false);
	const trimmedName = name.trim();
	const trimmedUrl = url.trim();
	/** Editing with an empty URL keeps the saved one. */
	const urlInvalid = trimmedUrl ? !isHookUrl(trimmedUrl) : !hook;
	const changed = !hook || trimmedName !== hook.name || !!trimmedUrl;
	const canSubmit = !!trimmedName && !urlInvalid && changed;
	const urlError = urlTouched && trimmedUrl && urlInvalid ? "Use an https:// URL." : undefined;

	const submit = () => {
		setUrlTouched(true);
		if (!canSubmit || mutation.isPending) return;
		const done = { onSuccess: onClose };
		if (hook) {
			update.mutate(
				{
					id: hook.id,
					...(trimmedName !== hook.name && { name: trimmedName }),
					...(trimmedUrl && { url: trimmedUrl }),
				},
				done,
			);
		} else {
			add.mutate({ name: trimmedName, url: trimmedUrl }, done);
		}
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<div className="space-y-3 px-4 py-3">
				<Field label="Name">
					{(props) => (
						<Input
							{...props}
							autoFocus
							value={name}
							readOnly={mutation.isPending}
							onChange={(event) => setName(event.target.value)}
						/>
					)}
				</Field>
				<Field
					label={hook ? "Replace URL" : "URL"}
					error={urlError}
					hint={hook ? "Leave empty to keep the current URL." : "The full URL can't be shown again once saved."}
				>
					{(props) => (
						<Input
							{...props}
							autoComplete="off"
							spellCheck={false}
							value={url}
							readOnly={mutation.isPending}
							onChange={(event) => setUrl(event.target.value)}
							onBlur={() => setUrlTouched(true)}
						/>
					)}
				</Field>
				{mutation.error && (
					<StateMessage
						size="inline"
						tone="err"
						icon={LucideAlertTriangle}
						title="Could not save"
						message={serverErrorMessage(mutation.error)}
					/>
				)}
			</div>
			<DialogFooter>
				<Button disabled={mutation.isPending} onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" pending={mutation.isPending} disabled={!canSubmit}>
					{mutation.isPending
						? hook
							? "Saving..."
							: "Adding..."
						: mutation.error
							? "Retry"
							: hook
								? "Save"
								: "Add hook"}
				</Button>
			</DialogFooter>
		</form>
	);
};

type HookDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The hook being edited; leave out to add a new one. */
	hook?: DeployHook;
};

/** The form lives inside the content, so its fields and error reset each time the dialog closes. */
export const HookDialog = ({ open, onOpenChange, hook }: HookDialogProps) => {
	const restoreFocus = useRestoreFocus(open);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				size="small"
				showClose={false}
				onCloseAutoFocus={restoreFocus}
				{...(hook ? {} : { "aria-describedby": undefined })}
			>
				<DialogHeader className="pr-4">
					<DialogTitle>{hook ? "Edit hook" : "Add hook"}</DialogTitle>
					{hook && (
						<DialogDescription className="font-mono text-secondary text-fg-2">{hook.maskedUrl}</DialogDescription>
					)}
				</DialogHeader>
				<HookForm hook={hook} onClose={() => onOpenChange(false)} />
			</DialogContent>
		</Dialog>
	);
};
