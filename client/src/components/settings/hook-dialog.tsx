import { useState } from "react";

import { LucideAlertTriangle } from "lucide-react";

import { serverErrorMessage } from "@/components/explorer/utils";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { StateMessage } from "@/components/ui/state-message";
import { useAddHook, useUpdateHook } from "@/lib/query";
import { HOOK_DESCRIPTION_MAX, isAllowedHookUrl } from "~/shared/hooks";
import type { DeployHook } from "~/shared/types";

const isHookUrl = (value: string) => {
	const url = URL.parse(value);
	return !!url && isAllowedHookUrl(url);
};

type HookValues = { name: string; url: string; description: string };

type HookFormProps = {
	hook?: DeployHook;
	pending: boolean;
	error?: string;
	/** `url` is empty when editing and the saved URL is kept. */
	onSave: (values: HookValues) => void;
	onCancel: () => void;
};

const HookForm = ({ hook, pending, error, onSave, onCancel }: HookFormProps) => {
	const [name, setName] = useState(hook?.name ?? "");
	const [url, setUrl] = useState("");
	const [description, setDescription] = useState(hook?.description ?? "");
	const [urlTouched, setUrlTouched] = useState(false);
	const trimmedName = name.trim();
	const trimmedUrl = url.trim();
	const trimmedDescription = description.trim();
	const invalidReason = trimmedUrl && !isHookUrl(trimmedUrl) ? "Use an https:// URL." : undefined;
	const changed = !hook || trimmedName !== hook.name || trimmedDescription !== hook.description || !!trimmedUrl;
	/** Editing with an empty URL keeps the saved one. */
	const [label, pendingLabel] = hook ? ["Save", "Saving..."] : ["Add hook", "Adding..."];
	const canSubmit = !!trimmedName && !invalidReason && (!!hook || !!trimmedUrl) && changed;

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				setUrlTouched(true);
				if (canSubmit && !pending) onSave({ name: trimmedName, url: trimmedUrl, description: trimmedDescription });
			}}
		>
			<div className="space-y-3 px-4 py-3">
				<Field label="Name">
					{(props) => (
						<Input
							{...props}
							autoFocus
							value={name}
							readOnly={pending}
							onChange={(event) => setName(event.target.value)}
						/>
					)}
				</Field>
				<Field label="Description (optional)" hint="One line on what it rebuilds, shown in the list.">
					{(props) => (
						<Input
							{...props}
							value={description}
							maxLength={HOOK_DESCRIPTION_MAX}
							readOnly={pending}
							onChange={(event) => setDescription(event.target.value)}
						/>
					)}
				</Field>
				<Field
					label={hook ? "Replace URL" : "URL"}
					error={urlTouched ? invalidReason : undefined}
					hint={hook ? "Leave empty to keep the current URL." : "The full URL can't be shown again once saved."}
				>
					{(props) => (
						<Input
							{...props}
							autoComplete="off"
							spellCheck={false}
							value={url}
							readOnly={pending}
							onChange={(event) => setUrl(event.target.value)}
							onBlur={() => setUrlTouched(true)}
						/>
					)}
				</Field>
				{error && (
					<StateMessage size="inline" tone="err" icon={LucideAlertTriangle} title="Could not save" message={error} />
				)}
			</div>
			<DialogFooter>
				<Button disabled={pending} onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" pending={pending} disabled={!canSubmit}>
					{pending ? pendingLabel : error && !invalidReason ? "Retry" : label}
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
	/** Runs once the hook is saved. */
	onSaved: () => void;
};

/** The mutations live here, above the form, so the dialog can refuse to close while a save is pending. */
export const HookDialog = ({ open, onOpenChange, hook, onSaved }: HookDialogProps) => {
	const add = useAddHook(onSaved);
	const update = useUpdateHook(onSaved);
	const mutation = hook ? update : add;

	const handleOpenChange = (next: boolean) => {
		if (!next) mutation.reset();
		onOpenChange(next);
	};

	const save = ({ name, url, description }: HookValues) => {
		const done = { onSuccess: () => handleOpenChange(false) };
		if (hook) {
			update.mutate(
				{
					id: hook.id,
					...(name !== hook.name && { name }),
					...(description !== hook.description && { description }),
					...(url && { url }),
				},
				done,
			);
		} else {
			add.mutate({ name, url, ...(description && { description }) }, done);
		}
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={handleOpenChange}
			title={hook ? "Edit hook" : "Add hook"}
			subtitle={hook?.maskedUrl}
			pending={mutation.isPending}
		>
			<HookForm
				hook={hook}
				pending={mutation.isPending}
				error={mutation.error ? serverErrorMessage(mutation.error) : undefined}
				onSave={save}
				onCancel={() => handleOpenChange(false)}
			/>
		</FormDialog>
	);
};
