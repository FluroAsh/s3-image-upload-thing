import { LucideFolderHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useCollections } from "@/lib/query";

import { AddSets } from "./add-sets";
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

			<DialogContent size={screen.screen === "detail" ? "wide" : "default"}>
				{screen.screen === "create" ? (
					<CreateScreen />
				) : screen.screen === "add" ? (
					<AddSets slug={screen.slug} />
				) : screen.screen === "detail" ? (
					<DetailScreen slug={screen.slug} />
				) : (
					<ListScreen />
				)}
			</DialogContent>
		</Dialog>
	);
};
