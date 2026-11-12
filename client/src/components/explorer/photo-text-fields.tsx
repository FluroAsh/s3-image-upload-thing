import { useId } from "react";

import type { UseMutationResult } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import type { ApiError } from "@/lib/ofetch";
import { cn } from "@/lib/utils";
import type { UpdatePhotoRequest } from "~/shared/types";

import { serverErrorMessage } from "./utils";

export const TEXT_DELETED_NOTE = "Its alt text and caption are deleted.";

type PhotoText = { alt: string | null; caption: string | null };

type TextField = "alt" | "caption";

type PhotoTextFieldsProps = {
	/** Path of the image set the text belongs to; keys the inputs so they reset when the set changes. */
	set: string;
	/** The saved text, or `undefined` when the set is in no collection, which disables the inputs. */
	photo: PhotoText | undefined;
	/** Called on blur with the changed field and its new value, `null` when cleared. */
	onSave: (field: TextField, value: string | null) => void;
	/** Also shows the caption input; alt text is always shown. */
	withCaption?: boolean;
	/** Placeholder of the alt text input. */
	altPlaceholder?: string;
	/** The last save: `error` is the reason it failed, and unset means it was saved. */
	result?: { field: TextField; error?: string };
};

/** The `result` line for the last photo write: what it changed, and why it failed if it did. */
export const photoSaveResult = (
	write: Pick<
		UseMutationResult<unknown, ApiError, { set: string } & UpdatePhotoRequest>,
		"variables" | "isError" | "isSuccess" | "error"
	>,
): PhotoTextFieldsProps["result"] => {
	const field = write.variables && "caption" in write.variables ? "caption" : "alt";
	if (write.isError && write.error) return { field, error: serverErrorMessage(write.error) };
	if (write.isSuccess) return { field };
};

export const PhotoTextFields = ({
	set,
	photo,
	onSave,
	withCaption = false,
	altPlaceholder = "Alt text",
	result,
}: PhotoTextFieldsProps) => {
	const id = useId();
	/** Keyed on the saved text so a refetch resets what was typed. */
	const field = (name: TextField, label: string, placeholder: string) => {
		const saved = photo?.[name] ?? "";
		const outcome = result?.field === name ? result : undefined;
		return (
			<div key={`${name}:${set}:${saved}`}>
				<label htmlFor={`${id}${name}`} className="mb-1 block text-caption text-fg-2">
					{label}
				</label>
				<Input
					id={`${id}${name}`}
					placeholder={placeholder}
					defaultValue={saved}
					disabled={!photo}
					invalid={!!outcome?.error}
					onBlur={(e) => {
						if (e.target.value !== saved) onSave(name, e.target.value || null);
					}}
				/>
				{outcome && (
					<span className={cn("mt-1 block text-caption", outcome.error ? "text-err" : "text-ok")}>
						{outcome.error ? `Could not save · ${outcome.error}` : "Saved"}
					</span>
				)}
			</div>
		);
	};

	return (
		<>
			{field("alt", "Alt text", altPlaceholder)}
			{withCaption && field("caption", "Caption", "Caption")}
		</>
	);
};
