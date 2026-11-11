import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { useAttachOriginal } from "@/lib/query";
import { cn } from "@/lib/utils";

/** Shows the set's image beside the chosen file, because the server can only check the aspect ratio, not that it is the same edit. */
export const OriginalUpload = ({
	attach,
	imageUrl,
	onStart,
}: {
	attach: ReturnType<typeof useAttachOriginal>;
	imageUrl: string;
	onStart: () => void;
}) => {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");

	useEffect(() => {
		if (!file) return setPreviewUrl("");
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	if (!file) {
		return (
			<label className={cn(buttonVariants(), "cursor-pointer")}>
				Upload original
				<input
					type="file"
					accept="image/*"
					className="sr-only"
					onChange={(event) => {
						attach.reset();
						onStart();
						setFile(event.target.files?.[0] ?? null);
						event.target.value = "";
					}}
				/>
			</label>
		);
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex gap-3">
				<figure className="flex-1">
					<img src={imageUrl} alt="Existing" className="max-h-48 w-full rounded-sm object-contain" />
					<figcaption>Existing image</figcaption>
				</figure>
				<figure className="flex-1">
					{previewUrl && (
						<img src={previewUrl} alt="Chosen file" className="max-h-48 w-full rounded-sm object-contain" />
					)}
					<figcaption>{file.name}</figcaption>
				</figure>
			</div>
			<span>Is this the same image as the existing one? Sizes are made from it.</span>
			<span className="flex gap-2">
				<Button
					pending={attach.isPending}
					onClick={() => {
						onStart();
						attach.mutate(file, { onSuccess: () => setFile(null) });
					}}
				>
					{attach.isPending ? "Uploading..." : "Confirm and upload"}
				</Button>
				<Button
					variant="ghost"
					disabled={attach.isPending}
					onClick={() => {
						attach.reset();
						setFile(null);
					}}
				>
					Cancel
				</Button>
			</span>
		</div>
	);
};
