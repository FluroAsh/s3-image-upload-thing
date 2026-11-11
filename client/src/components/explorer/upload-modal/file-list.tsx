import { useEffect, useState } from "react";

import { LucideFile, LucideX } from "lucide-react";

import { formatBytes } from "@/components/explorer/inspector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PickedFile } from "@/lib/upload-files";

/** A file's preview, or a file icon when the browser cannot decode it. */
export const Thumb = ({ file }: { file?: File }) => {
	const [url, setUrl] = useState<string>();
	const [broken, setBroken] = useState(false);

	useEffect(() => {
		if (!file) return;
		const objectUrl = URL.createObjectURL(file);
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [file]);

	return (
		<div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm bg-raised text-fg-2">
			{url && !broken ? (
				<img alt="" src={url} className="size-full object-cover" onError={() => setBroken(true)} />
			) : (
				<LucideFile className="size-4" />
			)}
		</div>
	);
};

const FileRow = ({
	picked: { file, width, height },
	warnings,
	onRemove,
}: {
	picked: PickedFile;
	warnings: string[];
	onRemove?: () => void;
}) => (
	<li className="flex h-12 items-center gap-2.5 border-b border-line px-2 last:border-b-0">
		<Thumb file={file} />
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

/** Rows of picked files; pass `onRemove` to let each be taken out and `warningsFor` to flag them. */
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

/** "4 files · 17.5 MB" for the footers. */
export const filesSummary = (files: PickedFile[]) =>
	`${files.length} ${files.length === 1 ? "file" : "files"} · ${formatBytes(files.reduce((sum, { file }) => sum + file.size, 0))}`;
