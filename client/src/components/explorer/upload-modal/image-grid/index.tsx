import { LucidePlus, LucideUpload } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

import { ImagePreview, PreviewGrid } from "./preview";

const AddImageButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "h-[120px] border-2 border-dashed border-neutral-500 rounded-md hover:bg-neutral-500/10",
      "transition-colors hover:text-neutral-300 text-neutral-500",
    )}
  >
    <div className="grid place-items-center gap-1">
      <LucidePlus className="size-6" />
      <span className="text-xs">Add Image</span>
    </div>
  </button>
);

const ImagePlaceholder = ({ onClick }: { onClick: () => void }) => (
  <div
    className={cn(
      "border-neutral-500 border-2 border-dashed grid place-items-center hover:cursor-pointer h-full rounded-md",
      "transition-colors text-neutral-500 hover:text-neutral-300 hover:bg-neutral-500/10",
    )}
    onClick={onClick}
  >
    <div className="flex flex-col items-center gap-2">
      <LucideUpload className="size-10 " />
      <p className="text-sm">Drag & drop an image, or click to browse</p>
    </div>
  </div>
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
    // overflow-y-auto is a temp fix to scroll when there's overflow
    // TODO: Fix the layout to handle overflow properly...
    <div className="overflow-y-auto overflow-x-hidden">
      <div id="main-image" className="mb-6 h-[350px]">
        {mainImage ? (
          <ImagePreview
            image={mainImage}
            onRemoveClick={() => handleRemoveImage(0)}
          />
        ) : (
          // TODO: Add drag & drop support
          <ImagePlaceholder onClick={triggerFileInput} />
        )}
      </div>

      <PreviewGrid items={restImages} handleRemoveImage={handleRemoveImage}>
        <AddImageButton onClick={triggerFileInput} />
      </PreviewGrid>

      <input
        name="images"
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
