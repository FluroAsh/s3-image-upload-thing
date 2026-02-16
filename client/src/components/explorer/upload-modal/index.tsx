import { LucideUpload } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
		title: "Upload Success!",
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
			<DialogTrigger className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-neutral-100 font-medium text-sm rounded-lg transition-colors duration-200">
				<LucideUpload className="size-4" />
				Upload Files
			</DialogTrigger>

			<DialogContent className="max-w-[700px] w-full bg-slate-900 border-slate-700">
				<DialogTitle className="text-xl font-semibold text-neutral-100">{title}</DialogTitle>
				<div className="min-h-[500px]">
					<Screen />
				</div>
			</DialogContent>
		</Dialog>
	);
};
