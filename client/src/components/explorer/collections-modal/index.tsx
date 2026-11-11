import { LucideFolderHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections } from "@/lib/query";

import { useCollectionsModal } from "./provider";
import { CreateScreen } from "./screen.create";
import { DetailScreen } from "./screen.detail";
import { ListScreen } from "./screen.list";

const DIALOG_CLOSE_DELAY_MS = 500;

export const CollectionsTrigger = () => {
	const { bucketName } = useExplorer().state;
	const { screen, resetState } = useCollectionsModal();
	const { data } = useCollections();
	const count = data?.collections.length ?? 0;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setTimeout(resetState, DIALOG_CLOSE_DELAY_MS);
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="ghost" disabled={!bucketName}>
					<LucideFolderHeart className="size-4" />
					Collections
					<span className="font-mono text-caption text-fg-1">{count}</span>
				</Button>
			</DialogTrigger>

			<DialogContent size="wide">
				<DialogHeader>
					<DialogTitle>{screen.screen === "create" ? "New collection" : `Collections in ${bucketName}`}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<div className="min-h-[500px]">
						{screen.screen === "create" ? (
							<CreateScreen />
						) : screen.screen === "detail" ? (
							<DetailScreen slug={screen.slug} />
						) : (
							<ListScreen />
						)}
					</div>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
};
