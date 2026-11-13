import { useEffect, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useDeployHooks, useDeployNow } from "@/lib/query";
import type { DeployHook } from "~/shared/types";

const isFailure = (hook: DeployHook) =>
	!!hook.lastResult && (hook.lastResult.status < 200 || hook.lastResult.status >= 300);

const useNow = () => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	return now;
};

const countdown = (ms: number) => {
	const seconds = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const ago = (ms: number) => {
	const minutes = Math.floor(ms / 60_000);
	return minutes < 1 ? "just now" : `${minutes} min ago`;
};

/** Pending shows before a failure, because the pending deploy will replace the failed result. */
export const DeployStatus = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	const { data } = useDeployHooks();
	const deploy = useDeployNow();
	const now = useNow();

	if (!data || data.hooks.length === 0) return null;

	if (data.pendingUntil) {
		return (
			<div className="flex items-center gap-1">
				<Badge className="tabular-nums">Deploys in {countdown(Date.parse(data.pendingUntil) - now)}</Badge>
				<Button variant="ghost" pending={deploy.isPending} onClick={() => deploy.mutate()}>
					Deploy now
				</Button>
			</div>
		);
	}

	const results = data.hooks.flatMap(({ lastResult }) => (lastResult ? [lastResult] : []));
	if (results.length === 0) return null;
	const lastAt = Math.max(...results.map(({ at }) => Date.parse(at)));
	const failed = data.hooks.filter(isFailure);

	if (failed.length > 0) {
		const params = new URLSearchParams({ bucket: bucketName, region: bucketRegion });
		return (
			<Link
				href={`/settings?${params}`}
				className="rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
			>
				<Badge tone="err">
					{failed.length} of {data.hooks.length} hooks failed
					<span className="sr-only">: {failed.map(({ name }) => name).join(", ")}</span>
					<span aria-hidden> · {ago(now - lastAt)}</span>
				</Badge>
			</Link>
		);
	}

	return (
		<span className="inline-flex items-center gap-1.5 text-caption text-fg-2">
			<span aria-hidden className="size-1.5 rounded-full bg-ok" />
			Deployed {ago(now - lastAt)}
		</span>
	);
};
