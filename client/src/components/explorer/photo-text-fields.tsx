import { FIELD_CLASS } from "./utils";

export const TEXT_DELETED_NOTE = "Its alt text and caption are deleted.";

type PhotoText = { alt: string | null; caption: string | null };

type PhotoTextFieldsProps = {
	set: string;
	photo: PhotoText | undefined;
	onSave: (field: "alt" | "caption", value: string | null) => void;
	withCaption?: boolean;
	altPlaceholder?: string;
};

export const PhotoTextFields = ({
	set,
	photo,
	onSave,
	withCaption = false,
	altPlaceholder = "Alt text",
}: PhotoTextFieldsProps) => {
	const field = (name: "alt" | "caption", label: string, placeholder: string) => {
		const saved = photo?.[name] ?? "";
		return (
			// Keyed on the saved text so a refetch resets what was typed.
			<input
				key={`${name}:${set}:${saved}`}
				aria-label={label}
				placeholder={placeholder}
				className={FIELD_CLASS}
				defaultValue={saved}
				disabled={!photo}
				onBlur={(e) => {
					if (e.target.value !== saved) onSave(name, e.target.value || null);
				}}
			/>
		);
	};

	return (
		<>
			{field("alt", "Alt text", altPlaceholder)}
			{withCaption && field("caption", "Caption", "Caption")}
		</>
	);
};
