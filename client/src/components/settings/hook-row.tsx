import { useState } from "react";

import { formatAgo, serverErrorMessage } from "@/components/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteHook, useTestHook } from "@/lib/query";
import type { DeployHook, HookResult } from "~/shared/types";

import { HookDialog } from "./hook-dialog";

export const isOk = ({ status }: HookResult) => status >= 200 && status < 300;

/** A 2xx is quiet; anything else, including a call that got no answer (status 0), is a red badge. */
const LastResult = ({ result }: { result: HookResult | null }) => {
	if (!result) return <span className="text-caption text-fg-2">Not called yet</span>;
	const text = `${result.status === 0 ? "No answer" : result.status} · ${formatAgo(result.at)}`;

	return isOk(result) ? (
		<span className="inline-flex items-center gap-1.5 font-mono text-caption text-fg-2">
			<span aria-hidden className="size-1.5 rounded-full bg-ok" />
			{text}
		</span>
	) : (
		<Badge tone="err" className="font-mono">
			{text}
		</Badge>
	);
};

export const HookRow = ({ hook }: { hook: DeployHook }) => {
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const test = useTestHook();
	const remove = useDeleteHook();

	return (
		<li className="px-3 py-2">
			<div className="flex items-center gap-3">
				<div className="min-w-0 flex-1">
					<p className="truncate text-body font-medium text-fg">{hook.name}</p>
					<p className="truncate font-mono text-caption text-fg-2">{hook.maskedUrl}</p>
				</div>
				<LastResult result={hook.lastResult} />
				<div className="flex items-center">
					<Button
						variant="ghost"
						pending={test.isPending}
						aria-label={`Test ${hook.name}`}
						onClick={() => test.mutate(hook.id)}
					>
						{test.isPending ? "Testing..." : "Test"}
					</Button>
					<Button variant="ghost" aria-label={`Edit ${hook.name}`} onClick={() => setEditing(true)}>
						Edit
					</Button>
					<Button variant="ghost" danger aria-label={`Delete ${hook.name}`} onClick={() => setDeleting(true)}>
						Delete
					</Button>
				</div>
			</div>
			{test.error && <p className="pt-1 text-caption text-err">Test failed · {serverErrorMessage(test.error)}</p>}
			<HookDialog open={editing} onOpenChange={setEditing} hook={hook} />
			<ConfirmDialog
				open={deleting}
				onOpenChange={setDeleting}
				title="Delete hook?"
				confirmLabel="Delete"
				pendingLabel="Deleting..."
				destructive
				pending={remove.isPending}
				error={remove.error ? serverErrorMessage(remove.error) : undefined}
				onConfirm={() => remove.mutate(hook.id, { onSuccess: () => setDeleting(false) })}
			>
				<strong className="font-medium text-fg">{hook.name}</strong> ·{" "}
				<span className="font-mono text-secondary">{hook.maskedUrl}</span> stops getting deploys from this bucket. The
				site itself is not changed.
			</ConfirmDialog>
		</li>
	);
};
