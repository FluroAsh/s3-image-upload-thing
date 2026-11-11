import { Fragment, type ReactNode } from "react";

import { LucideFile } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMessage } from "@/components/ui/state-message";
import { useActiveFile } from "@/hooks/useActiveFile";
import { useManifest } from "@/lib/query";
import type { Manifest } from "~/shared/types";

import { DetailsHeader } from "./details-header";
import { Preview } from "./details-preview";
import { publicUrlOf } from "./file-actions";
import { Field, formatBytes } from "./inspector";
import { CollectionSection } from "./panel.collection";
import { Sizes } from "./sizes";
import { fileType } from "./utils";

const CREATED_FORMAT = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const SetFields = ({ set, publicUrl }: { set: string; publicUrl: string }) => {
	const { data, isPending } = useManifest(set);
	/** Legacy sets lack a manifest; their fields read as unknown rather than as errors. */
	const value = (width: string, read: (manifest: Manifest) => ReactNode) =>
		isPending ? <Skeleton className={width} /> : data ? read(data) : "unknown";

	return (
		<dl>
			<Field label="Public URL" title={publicUrl}>
				{publicUrl}
			</Field>
			<Field label="Original">
				{value("w-28", ({ source }) =>
					source
						? `${source.width}×${source.height} · ${formatBytes(source.bytes)} · ${source.public ? "public" : "private"}`
						: "not kept",
				)}
			</Field>
			<Field label="Inline blur">
				{value("w-12", ({ placeholder }) =>
					placeholder ? (
						<span className="inline-flex items-center gap-1.5">
							<img src={placeholder} alt="" className="size-4 rounded-sm" />
							yes
						</span>
					) : (
						"no"
					),
				)}
			</Field>
			<Field label="Created">{value("w-16", ({ createdAt }) => CREATED_FORMAT.format(new Date(createdAt)))}</Field>
		</dl>
	);
};

export const DetailsPanel = () => {
	const active = useActiveFile();

	if (!active) {
		return (
			<div id="explorer-details-panel" className="flex-1 border-l border-line bg-panel">
				<StateMessage
					className="size-full"
					icon={LucideFile}
					title="No file selected"
					message="Select a file or image set in the tree to see its details."
				/>
			</div>
		);
	}

	const { remoteURL, name, folder, size, setPath, variants } = active;
	const publicUrl = publicUrlOf(remoteURL);

	return (
		<section
			id="explorer-details-panel"
			aria-label="File details"
			className="flex min-w-0 flex-1 flex-col border-l border-line bg-panel"
		>
			<DetailsHeader name={name} folder={folder} url={remoteURL} publicUrl={publicUrl} set={setPath} />
			<div className="flex min-h-0 flex-1">
				<Preview file={active} />
				<ScrollArea className="w-80 shrink-0 border-l border-line">
					{setPath ? (
						<Fragment key={setPath}>
							<div className="border-b border-line px-3 py-2">
								<SetFields set={setPath} publicUrl={publicUrl} />
							</div>
							<Sizes set={setPath} imageUrl={remoteURL} variants={variants} />
							<CollectionSection setPath={setPath} />
						</Fragment>
					) : (
						<div className="px-3 py-2">
							<dl>
								<Field label="Public URL" title={publicUrl}>
									{publicUrl}
								</Field>
								<Field label="Size">{size ?? "unknown"}</Field>
								<Field label="Type">{fileType(name)}</Field>
							</dl>
						</div>
					)}
				</ScrollArea>
			</div>
		</section>
	);
};
