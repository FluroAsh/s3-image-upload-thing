import { useRef } from "react";

import { LucidePlus, LucideUpload } from "lucide-react";

import { cn } from "@/lib/utils";
import { UPLOAD_FIELD } from "~/shared/constants/upload";

import { ImagePreview, PreviewGrid } from "./preview";

const AddImageButton = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			"h-[120px] border-2 border-dashed border-line-strong rounded-md hover:bg-raised",
			"transition-colors hover:text-fg-1 text-fg-2",
		)}
	>
		<div className="grid place-items-center gap-1">
			<LucidePlus className="size-6" />
			<span className="text-secondary">Add Image</span>
		</div>
	</button>
);

const ImagePlaceholder = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		className={cn(
			"border-line-strong border-2 border-dashed grid place-items-center hover:cursor-pointer h-full rounded-md",
			"transition-colors text-fg-2 hover:text-fg-1 hover:bg-raised",
		)}
		onClick={onClick}
		onKeyDown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		}}
	>
		<div className="flex flex-col items-center gap-2">
			<LucideUpload className="size-10 " />
			<p className="text-body">Drag & drop an image, or click to browse</p>
		</div>
	</button>
);

export const UploadImageGrid = ({
	setImages,
	mainImage,
	restImages,
}: {
	setImages: React.Dispatch<React.SetStateAction<File[]>>;
	mainImage?: File;
	restImages: File[];
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const newImages = [...e.target.files];
			setImages((prev) => [...prev, ...newImages]);
		}
	};

	const handleRemoveImage = (index: number) => {
		const images = [mainImage, ...restImages];
		const newImages = images.filter((_, i) => i !== index);
		setImages(newImages as File[]);
	};

	const triggerFileInput = () => inputRef.current?.click();

	return (
		<div className="overflow-y-auto overflow-x-hidden">
			<div id="main-image" className="mb-6 h-[350px]">
				{mainImage ? (
					<ImagePreview image={mainImage} onRemoveClick={() => handleRemoveImage(0)} />
				) : (
					<ImagePlaceholder onClick={triggerFileInput} />
				)}
			</div>

			<PreviewGrid items={restImages} handleRemoveImage={handleRemoveImage}>
				<AddImageButton onClick={triggerFileInput} />
			</PreviewGrid>

			<input
				name={UPLOAD_FIELD.Images}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFileChange}
				ref={inputRef}
				multiple
			/>
		</div>
	);
};
