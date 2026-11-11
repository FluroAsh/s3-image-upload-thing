import { useEffect, useState } from "react";

import { LucideAlertTriangle } from "lucide-react";

import { useAttachOriginal, useGenerateSizes, useManifest } from "@/lib/query";
import { sizeStatuses } from "~/shared/image-sizes";
import type { Manifest } from "~/shared/types";

import { StateMessage } from "../ui/state-message";
import { serverErrorMessage } from "./utils";

const BYTE_UNITS = ["B", "kB", "MB", "GB"];

const formatBytes = (bytes: number): string => {
	const unit = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), BYTE_UNITS.length - 1);
	return `${+(bytes / 1000 ** unit).toFixed(unit ? 1 : 0)} ${BYTE_UNITS[unit]}`;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** Shows the set's image beside the chosen file, because the server can only check the aspect ratio, not that it is the same edit. */
const OriginalUpload = ({
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
			<label className="cursor-pointer rounded bg-slate-700 px-1.5 py-0.5 text-slate-200 hover:bg-slate-600">
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
					<img src={imageUrl} alt="Existing" className="max-h-48 w-full rounded object-contain" />
					<figcaption>Existing image</figcaption>
				</figure>
				<figure className="flex-1">
					{previewUrl && <img src={previewUrl} alt="Chosen file" className="max-h-48 w-full rounded object-contain" />}
					<figcaption>{file.name}</figcaption>
				</figure>
			</div>
			<span>Is this the same image as the existing one? Sizes are made from it.</span>
			<span className="flex gap-2">
				<button
					type="button"
					disabled={attach.isPending}
					onClick={() => {
						onStart();
						attach.mutate(file, { onSuccess: () => setFile(null) });
					}}
					className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
				>
					{attach.isPending ? "Uploading..." : "Confirm and upload"}
				</button>
				<button
					type="button"
					disabled={attach.isPending}
					onClick={() => {
						attach.reset();
						setFile(null);
					}}
					className="rounded px-1.5 py-0.5 text-slate-400 hover:text-slate-200 disabled:opacity-50"
				>
					Cancel
				</button>
			</span>
		</div>
	);
};

const Info = ({ manifest, set, imageUrl }: { manifest: Manifest; set: string; imageUrl?: string }) => {
	const { placeholder, source } = manifest;
	const statuses = sizeStatuses(manifest);
	const generate = useGenerateSizes(set);
	const attach = useAttachOriginal(set);
	const error = attach.error ?? generate.error;
	const canGenerate = source && statuses.some(({ state }) => state === "missing");

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span className="flex flex-wrap gap-1">
				{statuses.map(({ name, state, variant, reason }) => {
					if (variant) {
						return (
							<span
								key={name}
								title={`${variant.width}×${variant.height} · ${formatBytes(variant.bytes)} · ${variant.format}${reason ? ` · ${reason}` : ""}`}
								className={`rounded px-1.5 py-0.5 ${state === "mismatched" ? "border border-dotted border-amber-700/60 bg-slate-800 text-slate-400" : "bg-slate-700 text-slate-300"}`}
							>
								{name} {variant.width}
								{state === "mismatched" && " (mismatched)"}
							</span>
						);
					}
					if (state === "notApplicable") return null;
					return (
						<span
							key={name}
							title="This size is missing"
							className="rounded border border-dashed border-slate-600 px-1.5 py-0.5 text-slate-500"
						>
							{name}
						</span>
					);
				})}
				{source ? (
					<span
						title={`${source.width}×${source.height} · ${formatBytes(source.bytes)} · ${source.public ? "public" : "private"}`}
						className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300"
					>
						original {source.width}
					</span>
				) : (
					<span
						title="Original not kept"
						className="rounded border border-dashed border-slate-600 px-1.5 py-0.5 text-slate-500"
					>
						original
					</span>
				)}
			</span>
			{placeholder ? (
				<span className="inline-flex items-center gap-1">
					<img src={placeholder} alt="" className="size-5 rounded" />
					Inline blur
				</span>
			) : (
				<span className="text-slate-500">No inline blur</span>
			)}
			{canGenerate && (
				<button
					type="button"
					disabled={generate.isPending}
					onClick={() => {
						attach.reset();
						generate.mutate();
					}}
					className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
				>
					{generate.isPending ? "Generating..." : "Generate missing sizes"}
				</button>
			)}
			{!source && imageUrl && <OriginalUpload attach={attach} imageUrl={imageUrl} onStart={generate.reset} />}
			{error && <span className="text-red-400">{serverErrorMessage(error)}</span>}
			<span>{DATE_FORMAT.format(new Date(manifest.createdAt))}</span>
		</div>
	);
};

/** `imageUrl` is the set's image on show; without one there is nothing to compare an original against, so no upload is offered. */
export const SetInfo = ({ set, imageUrl }: { set: string; imageUrl?: string }) => {
	const { data, error, isPending } = useManifest(set);

	return (
		<div className="text-xs text-slate-400">
			{isPending ? (
				"Loading set info..."
			) : error ? (
				error.status === 404 || error.status === 422 ? (
					<span className="text-slate-500">{error.status === 404 ? "No manifest" : "Unreadable manifest"}</span>
				) : (
					<StateMessage
						size="inline"
						tone="error"
						icon={LucideAlertTriangle}
						title="Could not load set info"
						message={serverErrorMessage(error)}
					/>
				)
			) : (
				<Info manifest={data} set={set} imageUrl={imageUrl} />
			)}
		</div>
	);
};
