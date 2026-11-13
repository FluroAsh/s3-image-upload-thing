import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { bucketLocationOf } from "@/shared/utils/params";
import { badRequest, respond } from "@/shared/utils/respond";
import type {
	AddHookRequest,
	DeleteHookResponse,
	DeployHook,
	DeployResponse,
	HookFired,
	HooksResponse,
	UpdateHookRequest,
} from "~/shared/types";

import {
	cancelPending,
	deployBucket,
	fireHook,
	forgetHook,
	lastResultOf,
	pendingUntil,
} from "../services/deploy-hooks";
import { hooksOf, readSettings, type StoredHook, updateHooks } from "../services/settings-store";

const bucketOf = (ctx: Context) => bucketLocationOf(ctx).bucketName;

/** Plain `http://localhost` is allowed outside production, so a local request catcher can stand in for a site. */
const isAllowedUrl = (url: URL) =>
	url.protocol === "https:" ||
	(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost");

const requireUrl = (value: unknown): string => {
	if (typeof value !== "string") throw badRequest("URL must be a valid https URL");
	const url = URL.parse(value);
	if (!url || !isAllowedUrl(url)) throw badRequest("URL must be a valid https URL");
	return value;
};

const requireName = (value: unknown): string => {
	if (typeof value !== "string" || !value.trim()) throw badRequest("Name is required");
	return value.trim();
};

const readBody = async (ctx: Context): Promise<Record<string, unknown>> => {
	const body = await ctx.req.json().catch(() => null);
	if (typeof body !== "object" || body === null) throw badRequest("Body must be a JSON object");
	return body;
};

const maskUrl = (value: string): string => `${new URL(value).host}/…${value.slice(-4)}`;

const present = ({ id, name, url }: StoredHook): DeployHook => ({
	id,
	name,
	maskedUrl: maskUrl(url),
	lastResult: lastResultOf(id),
});

const hookNotFound = () => new HTTPException(404, { message: "No such hook" });

export const listHooksHandler = (ctx: Context) =>
	respond<HooksResponse>(ctx, async () => {
		const bucket = bucketOf(ctx);
		return { hooks: hooksOf(await readSettings(), bucket).map(present), pendingUntil: pendingUntil(bucket) };
	});

export const addHookHandler = (ctx: Context) =>
	respond<DeployHook>(
		ctx,
		async () => {
			const bucket = bucketOf(ctx);
			const body: Partial<AddHookRequest> = await readBody(ctx);
			const hook = { id: crypto.randomUUID(), name: requireName(body.name), url: requireUrl(body.url) };
			await updateHooks(bucket, (hooks) => ({ hooks: [...hooks, hook], result: null }));
			return present(hook);
		},
		201,
	);

export const updateHookHandler = (ctx: Context) =>
	respond<DeployHook>(ctx, async () => {
		const body: UpdateHookRequest = await readBody(ctx);
		const { hook, urlChanged } = await updateHooks(bucketOf(ctx), (hooks) => {
			const current = hooks.find(({ id }) => id === ctx.req.param("id"));
			if (!current) throw hookNotFound();
			const next = {
				...current,
				...(body.name !== undefined && { name: requireName(body.name) }),
				...(body.url !== undefined && { url: requireUrl(body.url) }),
			};
			return {
				hooks: hooks.map((hook) => (hook === current ? next : hook)),
				result: { hook: next, urlChanged: next.url !== current.url },
			};
		});
		if (urlChanged) forgetHook(hook.id);
		return present(hook);
	});

export const deleteHookHandler = (ctx: Context) =>
	respond<DeleteHookResponse>(ctx, async () => {
		const bucket = bucketOf(ctx);
		const id = ctx.req.param("id");
		const left = await updateHooks(bucket, (hooks) => {
			if (!hooks.some((hook) => hook.id === id)) throw hookNotFound();
			const kept = hooks.filter((hook) => hook.id !== id);
			return { hooks: kept, result: kept.length };
		});
		forgetHook(id);
		if (left === 0) cancelPending(bucket);
		return { id };
	});

export const testHookHandler = (ctx: Context) =>
	respond<HookFired>(ctx, async () => {
		const bucket = bucketOf(ctx);
		const hook = hooksOf(await readSettings(), bucket).find(({ id }) => id === ctx.req.param("id"));
		if (!hook) throw hookNotFound();
		return fireHook(bucket, hook);
	});

export const deployHandler = (ctx: Context) =>
	respond<DeployResponse>(ctx, async () => ({ results: await deployBucket(bucketOf(ctx)) }));
