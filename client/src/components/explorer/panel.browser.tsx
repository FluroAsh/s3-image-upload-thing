import { LucideAlertTriangle, LucideDatabase, LucideFolder, LucideLoader2 } from "lucide-react";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useFileTree } from "@/lib/query";

import { ScrollArea } from "../ui/scroll-area";
import { StateMessage } from "../ui/state-message";
import { FileTree } from "./index";
import { AttentionPanel } from "./panel.attention";
import { PartialNotice } from "./partial-notice";
import { serverErrorMessage } from "./utils";

const BucketHeader = ({ bucketName }: { bucketName: string }) => (
	<div className="sticky top-0 bg-panel border-b border-line p-4 z-10">
		<div className="flex items-center gap-3">
			<div className="size-8 rounded-lg bg-accent/12 flex items-center justify-center">
				<LucideDatabase className="size-4 text-accent" />
			</div>
			<div>
				<h2 className="text-body font-semibold text-fg">{bucketName}</h2>
			</div>
		</div>
	</div>
);

export const BrowserPanel = () => {
	const { bucketName, bucketRegion, attentionFolder } = useExplorer().state;
	const { data, isLoading, error } = useFileTree(bucketName, bucketRegion);
	const hasMounted = useHasMounted();

	const shouldShowLoading = !hasMounted || isLoading;

	return (
		<nav className="flex flex-col flex-1 bg-canvas border-r border-line">
			<BucketHeader bucketName={bucketName} />

			<ScrollArea>
				{shouldShowLoading ? (
					<StateMessage spin icon={LucideLoader2} title="Loading file tree..." />
				) : error ? (
					<StateMessage
						tone="error"
						icon={LucideAlertTriangle}
						title="Failed to load files"
						message={serverErrorMessage(error)}
					/>
				) : attentionFolder !== null ? (
					<AttentionPanel key={attentionFolder} folder={attentionFolder} />
				) : data?.tree.length ? (
					<ScrollArea>
						{data.partial && <PartialNotice count={data.tree.length} />}
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
