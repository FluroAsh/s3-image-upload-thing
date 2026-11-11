import { LucideUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose, DialogFooter } from "@/components/ui/dialog";

import { filesSummary } from "./file-list";
import { FilesPicker } from "./files-picker";
import { FolderSelect } from "./folder-select";
import { useUpload } from "./provider";

export const UploadScreen = () => {
	const { files, submit } = useUpload();
	const count = files.length;

	return (
		<>
			<DialogBody>
				<FolderSelect />
				<FilesPicker />
			</DialogBody>
			<DialogFooter>
				<span className="mr-auto font-mono text-caption text-fg-2">{count ? filesSummary(files) : "No files"}</span>
				<DialogClose asChild>
					<Button>Cancel</Button>
				</DialogClose>
				<Button variant="primary" disabled={count === 0} onClick={submit}>
					<LucideUpload className="size-3.5" />
					{count > 0 ? `Upload ${count} ${count === 1 ? "file" : "files"}` : "Upload"}
				</Button>
			</DialogFooter>
		</>
	);
};
