import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
	LucideAlertTriangle,
	LucideHourglass,
	LucideLoader2,
	LucidePlus,
	LucideRocket,
	LucideWebhook,
} from "lucide-react";

import { serverErrorMessage } from "@/components/explorer/utils";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { useDeployHooks, useDeployNow } from "@/lib/query";
import { isOk } from "~/shared/hooks";
import type { DeployResponse, HookResult } from "~/shared/types";

import { HookDialog } from "./hook-dialog";
import { HookRow } from "./hook-row";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const DeployResultNotice = ({ results }: DeployResponse) => {
	const failed = results.filter(({ result }) => !isOk(result));
	if (failed.length === 0) {
		return (
			<StateMessage
				size="inline"
				tone="ok"
				icon={LucideRocket}
				title="Deployed"
				message={`${plural(results.length, "hook")} fired.`}
			/>
		);
	}

	const outcome = ({ status }: HookResult) => (status === 0 ? "did not answer" : `returned ${status}`);
	const [only] = failed;

	return (
		<StateMessage
			size="inline"
			tone="err"
			icon={LucideAlertTriangle}
			title={failed.length === 1 ? `${only.name} failed` : `${failed.length} hooks failed`}
			message={
				failed.length === 1
					? `It ${outcome(only.result)}.`
					: `${failed.map(({ name, result }) => `${name} ${outcome(result)}`).join(", ")}.`
			}
		/>
	);
};

const Panel = ({ children }: { children: React.ReactNode }) => (
	<div className="rounded-lg border border-line bg-panel">{children}</div>
);

type DeployHooksTabProps = {
	/** Where the tab row shows the active tab's actions. */
	actionsSlot: HTMLElement | null;
};

/** Keyed by bucket in the page, so a deploy result never carries over to another bucket. */
export const DeployHooksTab = ({ actionsSlot }: DeployHooksTabProps) => {
	const [adding, setAdding] = useState(false);
	const { data, error, isLoading, refetch } = useDeployHooks();
	const deploy = useDeployNow();
	const addRef = useRef<HTMLButtonElement>(null);
	const hooks = data?.hooks ?? [];
	const count = data ? hooks.length : undefined;
	const lastCount = useRef(count);
	const refocus = useRef(false);

	/** Deleting a hook, or adding the first, removes the button focus was on, so focus moves to Add hook once the dialog is closed. */
	useEffect(() => {
		const before = lastCount.current;
		lastCount.current = count;
		if (before !== undefined && count !== undefined && (count < before || (before === 0 && count > 0))) {
			refocus.current = true;
		}
		if (refocus.current && !adding) {
			addRef.current?.focus();
			refocus.current = false;
		}
	}, [count, adding]);

	const addHook = (
		<Button ref={addRef} variant="primary" onClick={() => setAdding(true)}>
			<LucidePlus className="size-3.5" />
			Add hook
		</Button>
	);

	return (
		<>
			{/* An empty list has its own Add hook button and nothing to deploy. */}
			{actionsSlot &&
				hooks.length > 0 &&
				createPortal(
					<>
						<Button pending={deploy.isPending} onClick={() => deploy.mutate()}>
							<LucideRocket className="size-3.5" />
							{deploy.isPending ? "Deploying..." : "Deploy now"}
						</Button>
						{addHook}
					</>,
					actionsSlot,
				)}
			<div className="space-y-3">
				{data?.pending && (
					<StateMessage
						size="inline"
						icon={LucideHourglass}
						title="Deploy pending"
						message="Hooks fire 2 minutes after the last change."
					/>
				)}
				{deploy.data && <DeployResultNotice results={deploy.data.results} />}
				{deploy.error && (
					<StateMessage
						size="inline"
						tone="err"
						icon={LucideAlertTriangle}
						title="Deploy failed"
						message={serverErrorMessage(deploy.error)}
					/>
				)}
				{isLoading ? (
					<Panel>
						<StateMessage className="py-8" spin icon={LucideLoader2} title="Loading hooks..." />
					</Panel>
				) : error ? (
					<Panel>
						<div className="flex flex-col items-center pb-8">
							<StateMessage
								className="pb-3"
								tone="err"
								icon={LucideAlertTriangle}
								title="Failed to load hooks"
								message={serverErrorMessage(error, "The settings could not be read. Try again shortly.")}
							/>
							<Button onClick={() => refetch()}>Retry</Button>
						</div>
					</Panel>
				) : hooks.length === 0 ? (
					<Panel>
						<div className="flex flex-col items-center pb-8">
							<StateMessage
								className="pb-3"
								icon={LucideWebhook}
								title="No deploy hooks yet"
								message="A URL this tool POSTs to after the bucket changes, so the site that reads it rebuilds."
							/>
							{addHook}
						</div>
					</Panel>
				) : (
					<ul className="divide-y divide-line rounded-lg border border-line bg-panel">
						{hooks.map((hook) => (
							<HookRow key={hook.id} hook={hook} onChanged={deploy.reset} />
						))}
					</ul>
				)}
			</div>
			<HookDialog open={adding} onOpenChange={setAdding} onSaved={deploy.reset} />
		</>
	);
};
