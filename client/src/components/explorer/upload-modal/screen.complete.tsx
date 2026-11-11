import type { FileVariant, ImageVariant, UploadFileResult, UploadStatus } from "~/shared/types";

import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";

import { useUpload } from "./provider";

const STATUS_TONE = { stored: "ok", refused: "warn", failed: "err" } as const satisfies Record<UploadStatus, string>;

const Header = ({ results }: { results: UploadFileResult[] }) => {
	const stored = results.filter(({ status }) => status === "stored").length;
	return (
		<p className="text-base text-fg-1 mt-2 mb-4 font-medium">
			Stored {stored} of {results.length} {results.length === 1 ? "image" : "images"}.
		</p>
	);
};

const variantSizeLabel: Record<ImageVariant, string> = {
	placeholder: "plch",
	thumbnail: "th",
	small: "sm",
	medium: "md",
	large: "lg",
	full: "full",
};

const FileItem = ({ file }: { file: FileVariant }) => {
	return (
		<div className="flex items-center justify-between bg-raised rounded-md p-2 border border-line-strong hover:border-fg-2 transition-colors">
			<Chip className="mr-2 uppercase">{variantSizeLabel[file.variant]}</Chip>

			<a
				href={file.imageURL}
				target="_blank"
				className="text-accent hover:underline text-body font-medium mr-2 flex-1"
			>
				{file.fileName}
			</a>
			<span className="text-xs text-fg-1 whitespace-nowrap">{file.size}</span>
		</div>
	);
};

const FileResult = ({ result }: { result: UploadFileResult }) => (
	<div className="bg-panel rounded-lg p-3 border border-line">
		<div className="flex items-center justify-between gap-2">
			<h4 className="text-body font-medium text-fg break-all">{result.file}</h4>
			<Badge tone={STATUS_TONE[result.status]} className="uppercase">
				{result.status}
			</Badge>
		</div>

		{result.reason && <p className="text-body text-fg-1 mt-2">{result.reason}</p>}

		{result.variants && (
			<div className="space-y-2 mt-2">
				{result.variants.map((variant) => (
					<FileItem key={`variant-${variant.fileName}-${variant.variant}`} file={variant} />
				))}
			</div>
		)}
	</div>
);

export const CompleteScreen = () => {
	const { uploadResponse } = useUpload();
	const results = uploadResponse?.results ?? [];

	return (
		<div>
			<Header results={results} />
			<div className="max-h-[700px] overflow-y-auto space-y-3 pr-2">
				{results.map((result) => (
					<FileResult key={result.file} result={result} />
				))}
			</div>
		</div>
	);
};
