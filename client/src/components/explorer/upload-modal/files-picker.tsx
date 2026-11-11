import { useRef, useState } from "react";

import { LucidePlus, LucideUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";
import { uploadWarnings } from "@/lib/upload-files";
import { cn } from "@/lib/utils";
import { UPLOAD_FIELD } from "~/shared/constants/upload";

import { FileList } from "./file-list";
import { useUpload } from "./provider";

export const FilesPicker = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const { files, destination, addFiles, removeFile } = useUpload();
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const folderId = destination ? `${destination}/` : "";
	const existingSets = new Set(
		(childMap.get(folderId) ?? []).filter(({ isFolder }) => isFolder).map(({ name }) => name),
	);
	const browse = () => inputRef.current?.click();

	return (
		<section
			aria-label="Files"
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
			}}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				void addFiles([...e.dataTransfer.files]);
			}}
		>
			<div className="mb-1.5 flex h-6 items-center justify-between">
				<h3 className="text-caption font-medium uppercase tracking-label text-fg-2">Files</h3>
				{files.length > 0 && (
					<Button variant="ghost" onClick={browse}>
						<LucidePlus className="size-3.5" />
						Add files
					</Button>
				)}
			</div>

			{files.length > 0 && (
				<FileList files={files} onRemove={removeFile} warningsFor={(picked) => uploadWarnings(picked, existingSets)} />
			)}

			{files.length === 0 ? (
				<button
					type="button"
					onClick={browse}
					className={cn(
						"flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-4 py-8 text-center transition-colors duration-100",
						dragging ? "border-accent bg-accent/12" : "border-line-strong hover:bg-raised",
					)}
				>
					<LucideUpload className="mb-1 size-4 text-fg-1" />
					<span className="text-body font-medium text-fg">
						{dragging ? "Drop to add" : "Drop images here, or click to browse"}
					</span>
					<span className="text-caption text-fg-2">Each file becomes a set named after it · JPEG, PNG, WebP, HEIC</span>
				</button>
			) : (
				dragging && (
					<p className="mt-2 rounded-md border border-dashed border-accent bg-accent/12 py-2 text-center text-secondary text-fg">
						Drop to add
					</p>
				)
			)}

			<input
				name={UPLOAD_FIELD.Images}
				type="file"
				accept="image/*"
				className="hidden"
				ref={inputRef}
				multiple
				onChange={(e) => {
					void addFiles([...(e.target.files ?? [])]);
					e.target.value = "";
				}}
			/>
		</section>
	);
};
