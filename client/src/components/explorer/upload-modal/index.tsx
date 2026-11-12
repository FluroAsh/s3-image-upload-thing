import { useState } from "react";

import { LucideUpload } from "lucide-react";

import { setPathOf } from "@/components/explorer/utils";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useActiveFile } from "@/hooks/useActiveFile";
import { useExplorer } from "@/lib/providers/explorer-provider";

import { EUploadState, type UploadState, useUpload } from "./provider";
import { CompleteScreen } from "./screen.complete";
import { ErrorScreen } from "./screen.error";
import { ProcessingScreen } from "./screen.processing";
import { UploadScreen } from "./screen.upload";

const MODAL_SCREENS: Record<UploadState, { title: string; component: React.FC }> = {
	[EUploadState.Idle]: { title: "Upload", component: UploadScreen },
	[EUploadState.Uploading]: { title: "Uploading", component: ProcessingScreen },
	[EUploadState.Error]: { title: "Upload failed", component: ErrorScreen },
	[EUploadState.Complete]: { title: "Upload complete", component: CompleteScreen },
};
/** Lets the close animation finish before the screen swaps back to the first one. */
const DIALOG_CLOSE_DELAY_MS = 500;

export const UploadTrigger = () => {
	const { bucketName } = useExplorer().state;
	const { uploadState, destination, setDestination, resetState } = useUpload();
	const active = useActiveFile();
	const [open, setOpen] = useState(false);

	const uploading = uploadState === EUploadState.Uploading;
	const { title, component: Screen } = MODAL_SCREENS[uploadState];

	const handleOpenChange = (next: boolean) => {
		if (!next && uploading) return;
		if (next) setDestination(active ? setPathOf(active.folder) : "");
		setOpen(next);
		if (!next) setTimeout(resetState, DIALOG_CLOSE_DELAY_MS);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="primary">
					<LucideUpload className="size-4" />
					Upload
				</Button>
			</DialogTrigger>

			<DialogContent closeDisabled={uploading}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="truncate font-mono text-secondary text-fg-2">
						→ {[bucketName, ...(destination ? destination.split("/") : [""])].join(" / ")}
					</DialogDescription>
				</DialogHeader>
				<Screen />
			</DialogContent>
		</Dialog>
	);
};
