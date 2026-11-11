import { useState } from "react";

import { LucideAlertTriangle, LucideArrowLeft, LucideCheck, LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/state-message";
import { useSetSelection } from "@/hooks/useSetSelection";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useAttention } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { SetAttention } from "~/shared/types";

import { PartialNotice } from "./partial-notice";
import { formatCount, serverErrorMessage } from "./utils";

const MANIFEST_NOTE = { none: "No manifest", notAManifest: "Not a manifest" } as const;

const Row = ({ row }: { row: SetAttention }) => {
	const { isActive, select } = useSetSelection(row.set);

	return (
		<li>
			<button
				type="button"
				onClick={select}
				className={cn(
					"flex w-full flex-col gap-1 rounded-md p-2 text-left text-body hover:bg-raised",
					isActive && "bg-accent/12",
				)}
			>
				<span className="truncate font-medium text-fg">{row.name}</span>
				<span className="flex flex-wrap gap-1 text-secondary">
					{row.manifest !== "present" && <Chip>{MANIFEST_NOTE[row.manifest]}</Chip>}
					{row.problems.map(({ name, state, reason }) => (
						<Chip key={name} title={reason} tone={state === "mismatched" ? "mismatched" : "missing"}>
							{name} {state === "mismatched" ? "mismatched" : "missing"}
						</Chip>
					))}
					<span className="px-1.5 text-fg-1">{row.hasOriginal ? "Original held" : "No original"}</span>
				</span>
			</button>
		</li>
	);
};

/** Lists the sets of one folder, by default only those missing a size, with a mismatched size or without a manifest. */
export const AttentionPanel = ({ folder }: { folder: string }) => {
	const {
		actions: { setAttentionFolder },
	} = useExplorer();
	const [all, setAll] = useState(false);
	const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useAttention(folder, all);
	const rows = data?.pages.flatMap(({ sets }) => sets) ?? [];
	const total = data?.pages[0]?.total;

	return (
		<div className="flex flex-col gap-2 p-2">
			<Button variant="ghost" className="self-start" onClick={() => setAttentionFolder(null)}>
				<LucideArrowLeft className="size-4" />
				Back to files
			</Button>
			<h3 className="text-body font-medium text-fg">
				{folder || "Bucket root"}
				{total !== undefined && (
					<span className="ml-2 text-secondary text-fg-1">{formatCount(total, "set", false)}</span>
				)}
			</h3>
			<label className="flex items-center gap-2 text-secondary text-fg-1">
				<input type="checkbox" checked={!all} onChange={(event) => setAll(!event.target.checked)} />
				Only sets needing attention
			</label>
			{isPending ? (
				<StateMessage spin icon={LucideLoader2} title="Checking sets..." />
			) : error && rows.length === 0 ? (
				<StateMessage
					tone="err"
					icon={LucideAlertTriangle}
					title="Failed to check sets"
					message={serverErrorMessage(error)}
				/>
			) : rows.length === 0 ? (
				<StateMessage
					icon={LucideCheck}
					title={all || total === 0 ? "No sets" : "Nothing needs attention"}
					message={
						total === 0
							? "No sets directly in this folder"
							: all
								? "This folder has no sets"
								: "Every set in this folder is complete"
					}
				/>
			) : (
				<ul>
					{rows.map((row) => (
						<Row key={row.set} row={row} />
					))}
				</ul>
			)}
			{data?.pages[0]?.partial && <PartialNotice count={total ?? 0} />}
			{error && rows.length > 0 && (
				<StateMessage
					size="inline"
					tone="err"
					icon={LucideAlertTriangle}
					title="Failed to load more"
					message={serverErrorMessage(error)}
				/>
			)}
			{hasNextPage && (
				<Button pending={isFetchingNextPage} onClick={() => fetchNextPage()}>
					{isFetchingNextPage ? "Loading..." : error ? "Retry" : "Load more"}
				</Button>
			)}
		</div>
	);
};
