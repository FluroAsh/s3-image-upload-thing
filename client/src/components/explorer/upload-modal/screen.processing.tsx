import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { IndeterminateBar } from "@/components/ui/indeterminate-bar";

import { FileList, filesSummary } from "./file-list";
import { useUpload } from "./provider";

export const ProcessingScreen = () => {
	const { files } = useUpload();
	const status = useRef<HTMLParagraphElement>(null);

	useEffect(() => status.current?.focus(), []);

	return (
		<>
			<DialogBody>
				<IndeterminateBar label="Uploading" />
				<p ref={status} tabIndex={-1} className="mt-3 text-body text-fg-1 outline-none">
					Uploading {filesSummary(files)}
				</p>
				<p className="mb-3 text-caption text-fg-2">Resizing happens on the server; large originals take a while.</p>
				<FileList files={files} />
			</DialogBody>
			<DialogFooter>
				<span className="mr-auto font-mono text-caption text-fg-2">Keep this tab open until it finishes</span>
				<Button disabled>Cancel</Button>
				<Button variant="primary" pending>
					Uploading…
				</Button>
			</DialogFooter>
		</>
	);
};
