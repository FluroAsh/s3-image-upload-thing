import type { HookFired, HookResult } from "~/shared/types";

import { hooksOf, readSettings, type StoredHook } from "./settings-store";

export const DEBOUNCE_MS = 2 * 60 * 1000;
const HOOK_TIMEOUT_MS = 10_000;

type Pending = { timer: ReturnType<typeof setTimeout>; deadline: number };

/** In memory only: a restart drops a pending deploy and the last results. */
const pending = new Map<string, Pending>();
const lastResults = new Map<string, HookResult>();

export const pendingUntil = (bucket: string): string | null => {
	const deadline = pending.get(bucket)?.deadline;
	return deadline === undefined ? null : new Date(deadline).toISOString();
};

export const lastResultOf = (hookId: string): HookResult | null => lastResults.get(hookId) ?? null;

export const forgetHook = (hookId: string) => lastResults.delete(hookId);

/** Logs the hook's name and the outcome, never its URL. */
export const fireHook = async (bucket: string, hook: StoredHook): Promise<HookFired> => {
	let status = 0;
	try {
		status = (await fetch(hook.url, { method: "POST", signal: AbortSignal.timeout(HOOK_TIMEOUT_MS) })).status;
	} catch (error) {
		console.error(`Deploy hook "${hook.name}" (${bucket}) failed: ${error instanceof Error ? error.name : "error"}`);
	}
	const result = { at: new Date().toISOString(), status };
	lastResults.set(hook.id, result);
	return { id: hook.id, name: hook.name, result };
};

export const cancelPending = (bucket: string) => {
	clearTimeout(pending.get(bucket)?.timer);
	pending.delete(bucket);
};

/** The pending entry outlives the hook calls, so a poll never sees neither a countdown nor a result. */
export const deployBucket = async (bucket: string): Promise<HookFired[]> => {
	const entry = pending.get(bucket);
	clearTimeout(entry?.timer);
	try {
		const hooks = hooksOf(await readSettings(), bucket);
		return await Promise.all(hooks.map((hook) => fireHook(bucket, hook)));
	} finally {
		if (pending.get(bucket) === entry) pending.delete(bucket);
	}
};

/** Restarts the bucket's countdown, so one deploy follows the last of a run of writes. */
export const markBucketChanged = async (bucket: string): Promise<void> => {
	if (hooksOf(await readSettings(), bucket).length === 0) return;
	cancelPending(bucket);
	const timer = setTimeout(() => {
		deployBucket(bucket).catch((error) => console.error(`Deploy of ${bucket} failed`, error));
	}, DEBOUNCE_MS);
	pending.set(bucket, { timer, deadline: Date.now() + DEBOUNCE_MS });
};
