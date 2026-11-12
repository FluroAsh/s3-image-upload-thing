import { useEffect, useMemo, useRef, useState } from "react";

import {
	LucideAlertTriangle,
	LucideChevronsUp,
	LucideFolder,
	LucideLoader2,
	LucideSearch,
	LucideXCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StateMessage } from "@/components/ui/state-message";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets, useFileTree } from "@/lib/query";

import { AttentionPanel } from "./panel.attention";
import { PartialNotice } from "./partial-notice";
import { FileTree } from "./tree";
import { buildRows } from "./tree-rows";
import { UploadTrigger } from "./upload-modal";
import { UploadProvider } from "./upload-modal/provider";
import { formatCount, formatSize, serverErrorMessage } from "./utils";

const FooterHints = ({ filtering }: { filtering: boolean }) =>
	filtering ? (
		<span className="flex items-center gap-1">
			<Kbd>esc</Kbd> clears
		</span>
	) : (
		<span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
			<Kbd>↑↓</Kbd>
			<Kbd>→</Kbd>
			<Kbd>⏎</Kbd>
			<Kbd>a</Kbd> attention
		</span>
	);

/** Opens the upload modal from the empty state, as the top bar's button does. */
const UploadAction = () => (
	<UploadProvider>
		<UploadTrigger />
	</UploadProvider>
);

const Pane = () => {
	const { bucketName, bucketRegion, attentionFolder } = useExplorer().state;
	const { data, isLoading, error, refetch, childMap } = useFileTree(bucketName, bucketRegion);
	const { data: buckets } = useBuckets();
	const hasMounted = useHasMounted();
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const filterRef = useRef<HTMLInputElement>(null);

	const loading = !hasMounted || isLoading;
	const ready = !loading && !error && !!data?.tree.length;
	const { rows, matches } = useMemo(() => buildRows(childMap, expanded, query), [childMap, expanded, query]);
	const filtering = query.trim() !== "";

	useEffect(() => {
		const focusFilter = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
			if (target.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
			event.preventDefault();
			filterRef.current?.focus();
		};
		document.addEventListener("keydown", focusFilter);
		return () => document.removeEventListener("keydown", focusFilter);
	}, []);

	const bucket = buckets?.buckets.find(({ Name }) => Name === bucketName);
	const total = data ? formatCount(data.tree.length, "item", data.partial) : "…";
	const size = data?.tree.length && bucket?.counted ? formatSize(bucket.totalSizeHuman, bucket.partial) : undefined;
	const footer = loading
		? "…"
		: error
			? "–"
			: filtering
				? `${matches} of ${total}`
				: [total, size].filter(Boolean).join(" · ");

	const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

	const body = loading ? (
		<StateMessage className="h-full" spin icon={LucideLoader2} title="Loading files..." />
	) : error ? (
		<div className="flex h-full flex-col items-center justify-center pb-6">
			<StateMessage
				tone="err"
				icon={LucideAlertTriangle}
				title="Failed to load files"
				message={serverErrorMessage(error, "The server could not be reached. Try again shortly.")}
			/>
			<Button onClick={() => refetch()}>Retry</Button>
		</div>
	) : !data?.tree.length ? (
		<div className="flex h-full flex-col items-center justify-center pb-6">
			<StateMessage icon={LucideFolder} title="No files yet" message="Upload images to start a set in this bucket." />
			<UploadAction />
		</div>
	) : rows.length === 0 ? (
		<StateMessage
			className="h-full"
			icon={LucideSearch}
			title={`No matches for “${query.trim()}”`}
			message="Matching is on folder, set and file names."
		/>
	) : (
		<FileTree rows={rows} query={query} onToggle={toggle} onClearFilter={() => setQuery("")} />
	);

	if (attentionFolder !== null && ready) {
		return (
			<ScrollArea className="min-h-0 flex-1">
				<AttentionPanel key={attentionFolder} folder={attentionFolder} />
			</ScrollArea>
		);
	}

	return (
		<>
			<div className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-1">
				<div className="relative flex-1">
					<LucideSearch
						aria-hidden
						className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-fg-2"
					/>
					<Input
						ref={filterRef}
						type="search"
						aria-label="Filter files"
						placeholder="Filter files...  ( / )"
						disabled={!ready}
						value={query}
						className="pl-7 pr-7 [&::-webkit-search-cancel-button]:hidden"
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => event.key === "Escape" && setQuery("")}
					/>
					{filtering && (
						<Button
							variant="icon"
							aria-label="Clear filter"
							className="absolute right-0.5 top-1/2 size-6 -translate-y-1/2"
							onClick={() => {
								setQuery("");
								filterRef.current?.focus();
							}}
						>
							<LucideXCircle className="size-3.5" />
						</Button>
					)}
				</div>
				<Button
					variant="icon"
					aria-label="Collapse all folders"
					title="Collapse all"
					disabled={!ready}
					onClick={() => setExpanded({})}
				>
					<LucideChevronsUp className="size-4" />
				</Button>
			</div>

			{data?.partial && ready && (
				<div className="shrink-0 p-1.5 pb-0">
					<PartialNotice count={data.tree.length} />
				</div>
			)}

			<ScrollArea className="min-h-0 flex-1">{body}</ScrollArea>

			<div className="flex h-row shrink-0 items-center justify-between gap-2 border-t border-line px-2 font-mono text-caption text-fg-2">
				<span className="truncate">{footer}</span>
				{ready && <FooterHints filtering={filtering} />}
			</div>
		</>
	);
};

export const BrowserPanel = () => {
	const { bucketName, bucketRegion } = useExplorer().state;

	return (
		<nav aria-label="File browser" className="flex w-[300px] shrink-0 flex-col border-r border-line bg-canvas">
			<Pane key={`${bucketName}/${bucketRegion}`} />
		</nav>
	);
};
