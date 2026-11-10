import type { FileVariant, ImageVariant, UploadFileResult, UploadStatus } from "~/shared/types";

import { useUpload } from "./provider";

const STATUS_LABEL: Record<UploadStatus, string> = {
	stored: "Stored",
	refused: "Refused",
	failed: "Failed",
};

const STATUS_STYLE: Record<UploadStatus, string> = {
	stored: "bg-green-900 text-green-200",
	refused: "bg-amber-900 text-amber-200",
	failed: "bg-red-900 text-red-200",
};

const Header = ({ results }: { results: UploadFileResult[] }) => {
	const stored = results.filter(({ status }) => status === "stored").length;
	return (
		<p className="text-base text-neutral-300 mt-2 mb-4 font-medium">
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
		<div className="flex items-center justify-between bg-neutral-700 rounded-md p-2 border border-neutral-600 hover:border-neutral-500 transition-colors">
			<span className="mr-2 bg-blue-900 text-blue-200 text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide pointer-events-none">
				{variantSizeLabel[file.variant]}
			</span>

			<a
				href={file.imageURL}
				target="_blank"
				className="text-blue-400 hover:text-blue-300 text-sm font-medium mr-2 flex-1"
			>
				{file.fileName}
			</a>
			<span className="text-xs text-neutral-300 whitespace-nowrap">{file.size}</span>
		</div>
	);
};

const FileResult = ({ result }: { result: UploadFileResult }) => (
	<div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
		<div className="flex items-center justify-between gap-2">
			<h4 className="text-sm font-medium text-neutral-200 break-all">{result.file}</h4>
			<span
				className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide ${STATUS_STYLE[result.status]}`}
			>
				{STATUS_LABEL[result.status]}
			</span>
		</div>

		{result.reason && <p className="text-sm text-neutral-400 mt-2">{result.reason}</p>}

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
