import { LucideAlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { StateMessage } from "@/components/ui/state-message";

import { FileList, filesSummary } from "./file-list";
import { useUpload } from "./provider";

export const ErrorScreen = () => {
	const { files, uploadError, removeFile, backToFiles, retryLast } = useUpload();

	return (
		<>
			<DialogBody>
				<StateMessage
					icon={LucideAlertTriangle}
					tone="err"
					size="inline"
					title="Nothing was stored"
					message={uploadError ?? undefined}
					className="mb-3"
				/>
				<FileList files={files} onRemove={removeFile} />
			</DialogBody>
			<DialogFooter>
				<span className="mr-auto font-mono text-caption text-fg-2">{filesSummary(files)} · kept</span>
				<Button onClick={backToFiles}>Back to files</Button>
				<Button variant="primary" disabled={files.length === 0} onClick={retryLast}>
					Retry
				</Button>
			</DialogFooter>
		</>
	);
};
