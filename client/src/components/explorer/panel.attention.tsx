import { useState } from "react";

import { LucideAlertTriangle, LucideArrowLeft, LucideCheck, LucideLoader2 } from "lucide-react";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { useAttention, useFileTree } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { SetAttention, TreeNode } from "~/shared/types";

import { StateMessage } from "../ui/state-message";
import { useSetSelection } from "./index";
import { serverErrorMessage } from "./utils";

const MANIFEST_NOTE = { none: "No manifest", unreadable: "Unreadable manifest" } as const;

const Row = ({ row }: { row: SetAttention }) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { childMap } = useFileTree(bucketName, bucketRegion);
	const id = `${row.set}/`;
	const node: TreeNode = { id, parentId: "", name: row.name, depth: 0, isFolder: true, childCount: 0 };
	const { remoteURL, activeFile, select } = useSetSelection(node, childMap.get(id) ?? []);

	return (
		<li>
			<button
				type="button"
				onClick={select}
				className={cn(
					"flex w-full flex-col gap-1 rounded-md p-2 text-left text-sm hover:bg-slate-700",
					remoteURL && activeFile.setPath === row.set && "bg-sky-800/30",
				)}
			>
				<span className="truncate font-medium text-neutral-100">{row.name}</span>
				<span className="flex flex-wrap gap-1 text-xs">
					{row.manifest !== "present" && (
						<span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300">{MANIFEST_NOTE[row.manifest]}</span>
					)}
					{row.problems.map(({ name, state, reason }) => (
						<span
							key={name}
							title={reason}
							className="rounded border border-dashed border-amber-700/60 px-1.5 py-0.5 text-slate-300"
						>
							{name} {state === "mismatched" ? "mismatched" : "missing"}
						</span>
					))}
					<span className="rounded px-1.5 py-0.5 text-slate-400">
						{row.hasOriginal ? "Original held" : "No original"}
					</span>
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
			<button
				type="button"
				onClick={() => setAttentionFolder(null)}
				className="flex items-center gap-2 text-sm text-slate-300 hover:text-neutral-100"
			>
				<LucideArrowLeft className="size-4" />
				Back to files
			</button>
			<h3 className="text-sm font-medium text-neutral-100">
				{folder || "Bucket root"}
				{total !== undefined && <span className="ml-2 text-xs text-slate-400">{total} sets</span>}
			</h3>
			<label className="flex items-center gap-2 text-xs text-slate-300">
				<input type="checkbox" checked={!all} onChange={(event) => setAll(!event.target.checked)} />
				Only sets needing attention
			</label>
			{isPending ? (
				<StateMessage tone="info" spin icon={LucideLoader2} title="Checking sets..." />
			) : error ? (
				<StateMessage
					tone="error"
					icon={LucideAlertTriangle}
					title="Failed to check sets"
					message={serverErrorMessage(error)}
				/>
			) : rows.length === 0 ? (
				<StateMessage
					icon={LucideCheck}
					title="Nothing needs attention"
					message="Every set in this folder is complete"
				/>
			) : (
				<ul>
					{rows.map((row) => (
						<Row key={row.set} row={row} />
					))}
				</ul>
			)}
			{hasNextPage && (
				<button
					type="button"
					disabled={isFetchingNextPage}
					onClick={() => fetchNextPage()}
					className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
				>
					{isFetchingNextPage ? "Loading..." : "Load more"}
				</button>
			)}
		</div>
	);
};
