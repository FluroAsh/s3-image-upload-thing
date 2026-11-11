import { LucideExternalLink, LucideFile, LucideImage, LucideLink } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { StateMessage } from "@/components/ui/state-message";
import { isImageFile, isVideoFile } from "@/lib/helpers";
import { useExplorer } from "@/lib/providers/explorer-provider";
import type { TreeNode } from "~/shared/types";

import { CollectionSection } from "./panel.collection";
import { SetInfo } from "./set-info";
import { getVariantType } from "./utils";

type ActiveVariantProps = {
	variant: TreeNode;
	remoteURL: string;
};

const ActiveVariant = ({ variant, remoteURL }: ActiveVariantProps) => {
	return (
		<li className="group">
			<a
				target="_blank"
				className="flex items-center justify-between p-3 rounded-lg bg-raised hover:bg-pressed border border-line hover:border-accent/50 transition-colors duration-100"
				href={remoteURL}
			>
				<div className="flex items-center gap-3">
					<div className="size-2 rounded-full bg-accent"></div>
					<div className="flex flex-col">
						<span className="text-body font-medium text-fg">{getVariantType(variant.name)}</span>
						<span className="text-secondary text-fg-1">{variant.size}</span>
					</div>
				</div>
				<LucideExternalLink className="size-4 text-fg-1 group-hover:text-accent transition-colors" />
			</a>
		</li>
	);
};

const PREVIEW_CONTAINER_SIZE = 600;

export const DetailsPanel = () => {
	const {
		activeFile: { remoteURL, fileName, variants, setPath },
	} = useExplorer().state;

	const isImage = isImageFile(remoteURL);
	const isVideo = isVideoFile(remoteURL);

	if (!remoteURL && !setPath) {
		return (
			<div id="explorer-details-panel" className="bg-panel border-l border-line flex-1">
				<StateMessage
					className="size-full"
					icon={LucideFile}
					title="No file selected"
					message="Select a file or image from the explorer to view its details and preview"
				/>
			</div>
		);
	}

	const Icon = isImage ? LucideImage : LucideFile;
	const previewURLText = remoteURL.split("?")[0];

	return (
		<ScrollArea
			id="explorer-details-panel"
			className="bg-panel border-l border-line flex-1 overflow-y-auto overflow-x-hidden"
			aria-label="File details"
		>
			<div className="border-b border-line p-6">
				<div className="flex items-center gap-3">
					<div className="size-10 rounded-lg bg-accent/12 flex items-center justify-center">
						<Icon className="size-6 stroke-accent" />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-fg">{fileName || "Active File"}</h2>
						<p className="text-body text-fg-1">File Preview & Details</p>
					</div>
				</div>
			</div>

			{remoteURL && (
				<div className="p-6 border-b border-line">
					<div className="flex items-center gap-2 mb-3">
						<LucideLink className="size-4 text-accent" />
						<h3 className="text-body font-medium text-fg">Remote URL</h3>
					</div>
					<a
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 p-3 rounded-lg bg-raised hover:bg-pressed border border-line-strong hover:border-accent/50 transition-colors duration-100 group w-full"
						href={remoteURL}
					>
						<span className="text-body text-fg break-all flex-1">{previewURLText}</span>
						<LucideExternalLink className="size-4 text-accent transition-colors flex-shrink-0" />
					</a>
				</div>
			)}

			{setPath && (
				<>
					<div className="p-6 border-b border-line">
						<h3 className="mb-3 text-body font-medium text-fg">Sizes</h3>
						<SetInfo key={setPath} set={setPath} imageUrl={remoteURL} />
					</div>
					<CollectionSection setPath={setPath} />
				</>
			)}

			{(isImage || isVideo) && (
				<div className="p-6 border-b border-line">
					<div className="flex items-center gap-2 mb-4">
						<LucideImage className="size-4 text-accent" />
						<h3 className="text-body font-medium text-fg">{isVideo ? "Video Preview" : "Preview"}</h3>
					</div>
					<div className="relative rounded-lg overflow-hidden border border-line-strong bg-raised">
						{isImage ? (
							<div
								className="mx-auto flex items-center justify-center "
								style={{ height: `${PREVIEW_CONTAINER_SIZE}px` }}
							>
								<img src={remoteURL} alt={fileName || "Preview"} className="max-w-full max-h-full object-contain" />
							</div>
						) : (
							// biome-ignore lint/a11y/useMediaCaption: User-uploaded videos don't currently have captions
							<video
								src={remoteURL}
								controls
								className="w-full"
								style={{ maxHeight: `${PREVIEW_CONTAINER_SIZE}px` }}
								onLoadedData={(e) => {
									e.currentTarget.volume = 0.25;
								}}
							/>
						)}
					</div>
				</div>
			)}

			{variants && variants.length > 0 && (
				<div className="p-6">
					<div className="flex items-center gap-2 mb-4">
						<div className="size-4 rounded-sm bg-accent"></div>
						<h3 className="text-body font-medium text-fg">Available Variants</h3>
						<span className="font-mono text-caption text-fg-1">{variants.length}</span>
					</div>
					<ul className="space-y-2">
						{variants.map((variant) => (
							<ActiveVariant key={`variant-${variant.name}`} variant={variant} remoteURL={variant.presignedUrl ?? ""} />
						))}
					</ul>
				</div>
			)}
		</ScrollArea>
	);
};
