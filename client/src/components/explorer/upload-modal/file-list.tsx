import { useEffect, useState } from "react";

import { LucideFile, LucideX } from "lucide-react";

import { FilePreview, useHoverPreview } from "@/components/explorer/hover-preview";
import { formatBytes } from "@/components/explorer/inspector";
import { formatCount } from "@/components/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/useInView";
import { type PickedFile, thumbnailOf } from "@/lib/upload-files";

/** A 40px thumbnail made from the file only once the row is in view, and previewed larger from the file on hover. */
export const Thumb = ({ picked }: { picked?: PickedFile }) => {
	const [ref, seen] = useInView();
	const hover = useHoverPreview();
	const [url, setUrl] = useState<string>();
	const [broken, setBroken] = useState(false);

	useEffect(() => {
		if (!picked || !seen) return;
		let objectUrl: string | undefined;
		let stale = false;
		thumbnailOf(picked).then(
			(blob) => {
				if (stale) return;
				objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
			},
			() => setBroken(true),
		);
		return () => {
			stale = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [picked, seen]);

	const showing = url && !broken;

	return (
		<div
			ref={ref}
			{...(showing ? hover.handlers : {})}
			className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm bg-raised text-fg-2"
		>
			{showing ? (
				<img alt="" src={url} decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
			) : (
				<LucideFile className="size-4" />
			)}
			{hover.at && picked && <FilePreview file={picked.file} start={hover.at} onClose={hover.close} />}
		</div>
	);
};

const FileRow = ({ picked, warnings, onRemove }: { picked: PickedFile; warnings: string[]; onRemove?: () => void }) => {
	const { file, width, height } = picked;
	return (
		<li className="flex h-12 items-center gap-2.5 border-b border-line px-2 last:border-b-0">
			<Thumb picked={picked} />
			<div className="min-w-0 flex-1">
				<p className="truncate font-mono text-body text-fg">{file.name}</p>
				<p className="font-mono text-caption text-fg-2">
					{width && height ? `${width}×${height} · ` : ""}
					{formatBytes(file.size)}
				</p>
			</div>
			{warnings.map((warning) => (
				<Badge key={warning} tone="warn" className="max-w-[260px] shrink-0 truncate">
					{warning}
				</Badge>
			))}
			{onRemove && (
				<Button variant="icon" onClick={onRemove} aria-label={`Remove ${file.name}`}>
					<LucideX className="size-3.5" />
				</Button>
			)}
		</li>
	);
};

export const FileList = ({
	files,
	onRemove,
	warningsFor = () => [],
}: {
	files: PickedFile[];
	onRemove?: (id: string) => void;
	warningsFor?: (picked: PickedFile) => string[];
}) => (
	<ul className="rounded-md border border-line bg-panel">
		{files.map((picked) => (
			<FileRow
				key={picked.id}
				picked={picked}
				warnings={warningsFor(picked)}
				onRemove={onRemove && (() => onRemove(picked.id))}
			/>
		))}
	</ul>
);

export const filesSummary = (files: PickedFile[]) =>
	`${formatCount(files.length, "file", false)} · ${formatBytes(files.reduce((sum, { file }) => sum + file.size, 0))}`;
