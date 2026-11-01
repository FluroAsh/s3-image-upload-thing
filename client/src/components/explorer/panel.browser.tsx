import { LucideAlertTriangle, LucideDatabase, LucideFolder, LucideLoader2 } from "lucide-react";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";

import { ScrollArea } from "../ui/scroll-area";
import { FileTree } from "./index";

const LoadingState = () => (
	<div className="flex flex-col items-center justify-center p-8 text-center">
		<LucideLoader2 className="size-8 text-slate-400 animate-spin mb-4" />
		<p className="text-sm text-slate-300">Loading file tree...</p>
	</div>
);

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center p-8 text-center">
		<div className="size-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
			<LucideFolder className="size-8 text-slate-400" />
		</div>
		<h3 className="text-sm font-medium text-neutral-100 mb-2">No files found</h3>
		<p className="text-xs text-slate-400 max-w-xs">This bucket has no files yet</p>
	</div>
);

const ErrorState = ({ message }: { message: string }) => (
	<div className="flex flex-col items-center justify-center p-8 text-center">
		<div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
			<LucideAlertTriangle className="size-8 stroke-red-500" />
		</div>
		<h3 className="text-sm font-medium text-neutral-100 mb-2">Failed to load files</h3>
		<p className="text-xs text-red-500 max-w-xs">{message}</p>
	</div>
);

const BucketHeader = ({ bucketName }: { bucketName: string }) => (
	<div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
		<div className="flex items-center gap-3">
			<div className="size-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
				<LucideDatabase className="size-4 text-sky-400" />
			</div>
			<div>
				<h2 className="text-sm font-semibold text-neutral-100">{bucketName}</h2>
			</div>
		</div>
	</div>
);

export const BrowserPanel = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { data: flatNodeList, isLoading, error } = useFileTree(bucketName, bucketRegion);
	const hasMounted = useHasMounted();

	const shouldShowLoading = !hasMounted || isLoading;

	return (
		<nav className="flex flex-col flex-1 bg-slate-900 border-r border-slate-700">
			<BucketHeader bucketName={bucketName} />

			<ScrollArea>
				{shouldShowLoading ? (
					<LoadingState />
				) : error ? (
					<ErrorState message={error.message} />
				) : flatNodeList?.length ? (
					<ScrollArea>
						<ul key={`file-tree-${bucketName}`} className="space-y-1 p-2">
							<FileTree />
						</ul>
					</ScrollArea>
				) : (
					<EmptyState />
				)}
			</ScrollArea>
		</nav>
	);
};
