import { LucideAlertTriangle } from "lucide-react";

import { useManifest } from "@/lib/query";
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
	const variants = Object.entries(manifest.variants).sort(([, a], [, b]) => a.width - b.width);

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span className="flex flex-wrap gap-1">
				{variants.map(([name, v]) => (
					<span
						key={name}
						title={`${v.width}×${v.height} · ${formatBytes(v.bytes)} · ${v.format}`}
						className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300"
					>
						{name} {v.width}
					</span>
				))}
			</span>
			{placeholder ? (
				<span className="inline-flex items-center gap-1">
					<img src={placeholder} alt="" className="size-5 rounded" />
					Placeholder
				</span>
			) : (
				<span className="text-amber-500">No placeholder</span>
			)}
			<span>
				{source
					? `Source ${source.width}×${source.height}, ${source.public ? "public" : "private"}`
					: "Source not kept"}
			</span>
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
				error.status === 404 ? (
					<span className="text-amber-500">No manifest</span>
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
