import { useState } from "react";

import { formatAgo, serverErrorMessage } from "@/components/explorer/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteHook, useTestHook } from "@/lib/query";
import { isOk } from "~/shared/hooks";
import type { DeployHook, HookResult } from "~/shared/types";

import { HookDialog } from "./hook-dialog";

/** A 2xx is quiet; anything else, including a call that got no answer (status 0), is a red badge. */
const LastResult = ({ result }: { result: HookResult | null }) => {
	if (!result) return <span className="text-caption text-fg-2">Not called yet</span>;
	const text = `${result.status === 0 ? "No answer" : result.status} · ${formatAgo(result.at)}`;

	return isOk(result) ? (
		<span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-caption text-fg-2">
			<span aria-hidden className="size-1.5 rounded-full bg-ok" />
			{text}
		</span>
	) : (
		<Badge tone="err" className="shrink-0 whitespace-nowrap font-mono">
			{text}
		</Badge>
	);
};

/** `onChanged` runs once an add, edit or delete has been saved, so the tab can drop what it showed about the old list. */
export const HookRow = ({ hook, onChanged }: { hook: DeployHook; onChanged: () => void }) => {
	const [editing, setEditing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const test = useTestHook();
	const remove = useDeleteHook(onChanged);

	return (
		<li className="px-3 py-2">
			<div className="flex items-center gap-3">
				<div className="min-w-0 flex-1">
					<p title={hook.name} className="truncate text-body font-medium text-fg">
						{hook.name}
					</p>
					{hook.description && (
						<p title={hook.description} className="truncate text-secondary text-fg-1">
							{hook.description}
						</p>
					)}
					<p className="truncate font-mono text-caption text-fg-2">{hook.maskedUrl}</p>
				</div>
				<LastResult result={hook.lastResult} />
				<div className="flex items-center">
					<Button
						variant="ghost"
						pending={test.isPending}
						aria-label={`${test.isPending ? "Testing" : "Test"} ${hook.name}`}
						onClick={() => test.mutate(hook.id)}
					>
						{test.isPending ? "Testing..." : "Test"}
					</Button>
					<Button
						variant="ghost"
						disabled={test.isPending}
						aria-label={`Edit ${hook.name}`}
						onClick={() => setEditing(true)}
					>
						Edit
					</Button>
					<Button
						variant="ghost"
						danger
						disabled={test.isPending}
						aria-label={`Delete ${hook.name}`}
						onClick={() => setDeleting(true)}
					>
						Delete
					</Button>
				</div>
			</div>
			{test.error && <p className="pt-1 text-caption text-err">Test failed · {serverErrorMessage(test.error)}</p>}
			<HookDialog
				open={editing}
				onOpenChange={setEditing}
				hook={hook}
				onSaved={() => {
					test.reset();
					onChanged();
				}}
			/>
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
