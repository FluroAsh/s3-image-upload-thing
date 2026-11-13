import { useEffect, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeployHooks, useDeployNow } from "@/lib/query";
import { useBucketHref } from "@/lib/use-bucket-href";
import { isOk } from "~/shared/hooks";
import type { DeployHook } from "~/shared/types";

const isFailure = ({ lastResult }: DeployHook) => !!lastResult && !isOk(lastResult);

/** A settled status stops being news after this long, so the top bar clears. */
const SETTLED_MS = 30 * 60_000;

/** True once `at` is older than SETTLED_MS; one timer per settled deploy instead of a ticking clock. */
const useSettledExpired = (at: number | undefined) => {
	const [expired, setExpired] = useState(false);
	useEffect(() => {
		if (at === undefined) return;
		const left = at + SETTLED_MS - Date.now();
		setExpired(left <= 0);
		if (left <= 0) return;
		const timer = setTimeout(() => setExpired(true), left);
		return () => clearTimeout(timer);
	}, [at]);
	return expired;
};

/** Pending shows before a failure, because the pending deploy will replace the failed result. */
export const DeployStatus = () => {
	const settingsHref = useBucketHref("/settings");
	const { data } = useDeployHooks();
	const deploy = useDeployNow();
	const results = data?.hooks.flatMap(({ lastResult }) => (lastResult ? [lastResult] : [])) ?? [];
	const lastAt = results.length ? Math.max(...results.map(({ at }) => Date.parse(at))) : undefined;
	const expired = useSettledExpired(lastAt);

	if (!data || data.hooks.length === 0) return null;

	if (data.pending) {
		return (
			<div className="flex items-center gap-1">
				<Badge className="whitespace-nowrap">Deploy pending</Badge>
				<Button variant="ghost" pending={deploy.isPending} onClick={() => deploy.mutate()}>
					Deploy now
				</Button>
			</div>
		);
	}

	if (lastAt === undefined || expired) return null;
	const failed = data.hooks.filter(isFailure);

	if (failed.length > 0) {
		return (
			<Link
				href={settingsHref}
				className="rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
			>
				<Badge tone="err" className="whitespace-nowrap">
					{failed.length} of {data.hooks.length} hooks failed
					<span className="sr-only">: {failed.map(({ name }) => name).join(", ")}</span>
				</Badge>
			</Link>
		);
	}

	return (
		<span className="inline-flex items-center gap-1.5 text-caption text-fg-2">
			<span aria-hidden className="size-1.5 rounded-full bg-ok" />
			Deployed
		</span>
	);
};
