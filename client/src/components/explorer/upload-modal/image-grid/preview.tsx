import { LucideX } from "lucide-react";

import { cn } from "@/lib/utils";

type ImageGridProps = {
	items: File[];
	handleRemoveImage: (index: number) => void;
	children?: React.ReactNode;
};

export const PreviewGrid = ({ items, children, handleRemoveImage }: ImageGridProps) => {
	return (
		<div className="grid grid-cols-5 gap-4 max-h-[250px]">
			{items.map((item, i) => (
				// Force images to be square and "slightly" break the grid layout if necessary while maintaining
				// the aspectio ratio and spacing
				<div key={`preview-image-${item.name}`} className="h-[120px] aspect-square">
					{/* eslint-disable-next-line */}
					<ImagePreview image={item} onRemoveClick={() => handleRemoveImage(i + 1)} />
				</div>
			))}

			{children}
		</div>
	);
};

type ImageProps = {
	image: File;
	onRemoveClick: () => void;
};

export const ImagePreview = ({ image, onRemoveClick }: ImageProps) => {
	return (
		<div className="relative size-full group">
			<button
				type="button"
				className={cn(
					"absolute z-10 size-[28px] -top-3 -right-3 bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm rounded-full grid place-items-center",
					"transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg border border-white/20",
				)}
				onClick={onRemoveClick}
				title="Remove image"
			>
				<LucideX className="stroke-neutral-100 size-4" />
			</button>

			<div className="overflow-hidden rounded-md h-full">
				<img className="size-full object-cover object-center" src={URL.createObjectURL(image)} alt={image.name} />
			</div>
		</div>
	);
};
