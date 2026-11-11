import { LucideFile } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import type { ActiveFile } from "@/hooks/useActiveFile";
import { isImageFile, isVideoFile } from "@/lib/helpers";
import { useManifest } from "@/lib/query";

import { fileType, variantOf } from "./utils";

const PreviewChips = ({ set, variantName }: { set: string; variantName: string }) => {
	const variant = useManifest(set).data?.variants[variantName];

	return (
		<div className="absolute bottom-2 left-2 flex gap-1">
			<Chip className="border border-line bg-panel">
				{variant ? `${variantName} · ${variant.width}×${variant.height}` : variantName}
			</Chip>
			{variant && <Chip className="border border-line bg-panel">{variant.format}</Chip>}
		</div>
	);
};

export const Preview = ({ file }: { file: ActiveFile }) => {
	const { remoteURL, name, size, setPath, previewNode } = file;
	const previewName = previewNode?.name ?? name;

	return (
		<div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-checkerboard p-6">
			{!remoteURL ? null : isImageFile(previewName) ? (
				<img
					src={remoteURL}
					alt={name}
					className="max-h-full max-w-full rounded-md border border-line object-contain"
				/>
			) : isVideoFile(previewName) ? (
				// biome-ignore lint/a11y/useMediaCaption: User-uploaded videos don't currently have captions
				<video
					src={remoteURL}
					controls
					className="max-h-full max-w-full rounded-md border border-line bg-canvas"
					onLoadedData={(e) => {
						e.currentTarget.volume = 0.25;
					}}
				/>
			) : (
				<div className="flex flex-col items-center gap-2 text-fg-2">
					<LucideFile className="size-8" />
					<span className="font-mono text-secondary">{[fileType(name), size].filter(Boolean).join(" · ")}</span>
				</div>
			)}
			{setPath && previewNode && <PreviewChips set={setPath} variantName={variantOf(previewNode.name)} />}
		</div>
	);
};
