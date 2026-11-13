import { formatBytes } from "@/components/explorer/inspector";
import { formatCount } from "@/components/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DialogBody, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { type PickedFile, skippedSizes } from "@/lib/upload-files";
import type { ImageVariant, UploadFileResult, UploadStatus } from "~/shared/types";

import { Thumb } from "./file-list";
import { useUpload } from "./provider";

const STATUS_TONE = { stored: "ok", refused: "warn", failed: "err" } as const satisfies Record<UploadStatus, string>;

const VARIANT_LABEL: Record<ImageVariant, string> = {
	placeholder: "plch",
	thumbnail: "thumb",
	small: "sm",
	medium: "md",
	large: "lg",
	full: "full",
};

const detailOf = ({ status, reason, variants = [] }: UploadFileResult) => {
	if (status !== "stored") return `${status === "failed" ? "Failed" : "Refused"} · ${reason ?? "no reason given"}`;
	const skipped = skippedSizes(variants.map(({ variant }) => variant));
	const sizes = formatCount(variants.length, "size", false);
	return skipped.length > 0 ? `Stored · ${sizes} · ${skipped.join(", ")} skipped` : `Stored · ${sizes}`;
};

const ResultRow = ({ result, picked }: { result: UploadFileResult; picked?: PickedFile }) => (
	<li className="flex min-h-12 items-center gap-2.5 border-b border-line px-2 py-1 last:border-b-0">
		<Thumb picked={result.status === "stored" ? picked : undefined} />
		<div className="min-w-0 flex-1">
			<p className="truncate font-mono text-body text-fg">{result.file}</p>
			<p className={result.status === "failed" ? "text-caption text-err" : "text-caption text-fg-2"}>
				{detailOf(result)}
			</p>
		</div>
		{result.status === "stored" ? (
			<div className="flex shrink-0 flex-wrap justify-end gap-1">
				{result.variants?.map(({ variant, imageURL, width, height, size }) => (
					<a
						key={variant}
						href={imageURL}
						target="_blank"
						rel="noreferrer"
						title={`${variant} · ${width}×${height} · ${size}`}
						className="rounded-sm hover:text-fg"
					>
						<Chip className="hover:bg-pressed">{VARIANT_LABEL[variant]}</Chip>
					</a>
				))}
			</div>
		) : (
			<Badge tone={STATUS_TONE[result.status]}>{result.status}</Badge>
		)}
	</li>
);

const Summary = ({ results }: { results: UploadFileResult[] }) => {
	const count = (wanted: UploadStatus) => results.filter(({ status }) => status === wanted).length;
	const stored = results.filter(({ status }) => status === "stored");
	const variants = stored.reduce((sum, { variants = [] }) => sum + variants.length, 0);
	const bytes = stored.reduce((sum, { variants = [] }) => sum + variants.reduce((s, { bytes }) => s + bytes, 0), 0);

	return (
		<div className="mb-3 flex items-center gap-1.5">
			{(["stored", "refused", "failed"] as const).map(
				(status) =>
					count(status) > 0 && (
						<Badge key={status} tone={STATUS_TONE[status]}>
							{count(status)} {status}
						</Badge>
					),
			)}
			<span className="ml-auto font-mono text-caption text-fg-2">
				{stored.length > 0
					? `${formatCount(results.length, "file", false)} · ${variants} variants · ${formatBytes(bytes)} stored`
					: "nothing stored"}
			</span>
		</div>
	);
};

export const CompleteScreen = () => {
	const { uploadResponse, files, retryFailed, backToFiles, uploadMore } = useUpload();
	const results = uploadResponse?.results ?? [];
	const failed = results.filter(({ status }) => status === "failed").length;
	const nothingStored = !results.some(({ status }) => status === "stored");

	return (
		<>
			<DialogBody>
				<Summary results={results} />
				<ul className="rounded-md border border-line bg-panel">
					{results.map((result) => (
						<ResultRow key={result.file} result={result} picked={files.find(({ file }) => file.name === result.file)} />
					))}
				</ul>
			</DialogBody>
			<DialogFooter>
				{failed > 0 && (
					<Button variant="ghost" className="mr-auto" onClick={retryFailed}>
						Retry failed ({failed})
					</Button>
				)}
				{nothingStored ? (
					<Button onClick={backToFiles}>Back to files</Button>
				) : (
					<Button onClick={uploadMore}>Upload more</Button>
				)}
				<DialogClose asChild>
					<Button variant="primary">Done</Button>
				</DialogClose>
			</DialogFooter>
		</>
	);
};
