import { LucideUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { EUploadState, type UploadState, useUpload } from "./provider";
import { CompleteScreen } from "./screen.complete";
import { ErrorScreen } from "./screen.error";
import { ProcessingScreen } from "./screen.processing";
import { UploadScreen } from "./screen.upload";

const MODAL_SCREENS: Record<UploadState, { title: string; component: React.FC }> = {
	[EUploadState.Idle]: {
		title: "Upload",
		component: UploadScreen,
	},
	[EUploadState.Uploading]: {
		title: "Upload in Progress",
		component: ProcessingScreen,
	},
	[EUploadState.Error]: {
		title: "Upload Error",
		component: ErrorScreen,
	},
	[EUploadState.Complete]: {
		title: "Upload Complete",
		component: CompleteScreen,
	},
};
const DIALOG_CLOSE_DELAY_MS = 500;

export const UploadTrigger = () => {
	const { uploadState, resetState } = useUpload();

	const Screen = MODAL_SCREENS[uploadState].component;
	const title = MODAL_SCREENS[uploadState].title;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setTimeout(resetState, DIALOG_CLOSE_DELAY_MS);
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="primary">
					<LucideUpload className="size-4" />
					Upload
				</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<div className="min-h-[500px]">
						<Screen />
					</div>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
};
