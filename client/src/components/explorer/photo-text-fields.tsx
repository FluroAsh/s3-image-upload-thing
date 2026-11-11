import { Input } from "@/components/ui/input";

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
	/** Keyed on the saved text so a refetch resets what was typed. */
	const field = (name: "alt" | "caption", label: string, placeholder: string) => {
		const saved = photo?.[name] ?? "";
		return (
			<Input
				key={`${name}:${set}:${saved}`}
				aria-label={label}
				placeholder={placeholder}
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
