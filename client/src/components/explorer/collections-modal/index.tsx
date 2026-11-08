import { LucideFolderHeart } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { useCollectionsModal } from "./provider";
import { CreateScreen } from "./screen.create";
import { ListScreen } from "./screen.list";

const DIALOG_CLOSE_DELAY_MS = 500;

export const CollectionsTrigger = () => {
	const { bucketName } = useExplorer().state;
	const { screen, resetState } = useCollectionsModal();

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setTimeout(resetState, DIALOG_CLOSE_DELAY_MS);
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger
				disabled={!bucketName}
				className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-neutral-100 font-medium text-sm rounded-lg transition-colors duration-200"
			>
				<LucideFolderHeart className="size-4" />
				Collections
			</DialogTrigger>

			<DialogContent className="max-w-[900px] w-full bg-slate-900 border-slate-700">
				<DialogTitle className="text-xl font-semibold text-neutral-100">
					{screen.screen === "create" ? "New collection" : `Collections in ${bucketName}`}
				</DialogTitle>
				<div className="min-h-[500px]">{screen.screen === "create" ? <CreateScreen /> : <ListScreen />}</div>
			</DialogContent>
		</Dialog>
	);
};
