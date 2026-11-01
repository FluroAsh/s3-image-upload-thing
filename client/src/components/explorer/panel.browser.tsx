import { LucideAlertTriangle, LucideDatabase, LucideFolder, LucideHourglass, LucideLoader2 } from "lucide-react";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";

import { ScrollArea } from "../ui/scroll-area";
import { StateMessage } from "../ui/state-message";
import { FileTree } from "./index";
import { formatCount, serverErrorMessage } from "./utils";

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
	const { data, isLoading, error } = useFileTree(bucketName, bucketRegion);
	const hasMounted = useHasMounted();

	const shouldShowLoading = !hasMounted || isLoading;

	return (
		<nav className="flex flex-col flex-1 bg-slate-900 border-r border-slate-700">
			<BucketHeader bucketName={bucketName} />

			<ScrollArea>
				{shouldShowLoading ? (
					<StateMessage tone="info" spin icon={LucideLoader2} title="Loading file tree..." />
				) : error ? (
					<StateMessage
						tone="error"
						icon={LucideAlertTriangle}
						title="Failed to load files"
						message={serverErrorMessage(error, "Something went wrong. Try again shortly.")}
					/>
				) : data?.tree.length ? (
					<ScrollArea>
						{data.partial && (
							<StateMessage
								size="inline"
								tone="info"
								icon={LucideHourglass}
								title={`Showing the first ${formatCount(data.tree.length, "item", false)}`}
								message="The listing took too long, so later folders and files are missing."
							/>
						)}
						<ul key={`file-tree-${bucketName}`} className="space-y-1 p-2">
							<FileTree />
						</ul>
					</ScrollArea>
				) : (
					<StateMessage icon={LucideFolder} title="No files found" message="This bucket has no files yet" />
				)}
			</ScrollArea>
		</nav>
	);
};
