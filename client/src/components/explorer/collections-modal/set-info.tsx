import { LucideAlertTriangle } from "lucide-react";

import { useManifest } from "@/lib/query";
import { IMAGE_VARIANTS, planVariants } from "~/shared/constants/image-variants";
import type { Manifest } from "~/shared/types";

import { StateMessage } from "../../ui/state-message";
import { serverErrorMessage } from "../utils";

const BYTE_UNITS = ["B", "kB", "MB", "GB"];

const formatBytes = (bytes: number): string => {
	const unit = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), BYTE_UNITS.length - 1);
	return `${+(bytes / 1000 ** unit).toFixed(unit ? 1 : 0)} ${BYTE_UNITS[unit]}`;
};

const DATE_FORMAT = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const Info = ({ manifest }: { manifest: Manifest }) => {
	const { placeholder, source } = manifest;
	const { full } = manifest.variants;
	// An upload skips sizes above the source's, so `full` (stored at the source's size) says which were expected; legacy sets without it expect them all.
	const names = full ? planVariants(Math.max(full.width, full.height)) : IMAGE_VARIANTS;

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span className="flex flex-wrap gap-1">
				{names.map((name) => {
					const variant = manifest.variants[name];
					return variant ? (
						<span
							key={name}
							title={`${variant.width}×${variant.height} · ${formatBytes(variant.bytes)} · ${variant.format}`}
							className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300"
						>
							{name} {variant.width}
						</span>
					) : (
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
			<span>{DATE_FORMAT.format(new Date(manifest.createdAt))}</span>
		</div>
	);
};

export const SetInfo = ({ set }: { set: string }) => {
	const { data, error, isPending } = useManifest(set);

	return (
		<div className="border-t border-slate-700 pt-2 text-xs text-slate-400">
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
				<Info manifest={data} />
			)}
		</div>
	);
};
