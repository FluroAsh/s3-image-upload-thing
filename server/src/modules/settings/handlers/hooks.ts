import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type {
	AddHookRequest,
	DeleteHookResponse,
	DeployHook,
	DeployResponse,
	HookFired,
	HooksResponse,
	UpdateHookRequest,
} from "~/shared/types";

import { bucketLocationOf } from "../../storage/handlers/params";
import { badRequest, respond } from "../../storage/handlers/respond";
import { deployBucket, fireHook, forgetHook, lastResultOf, pendingUntil } from "../services/deploy-hooks";
import { hooksOf, readSettings, type StoredHook, updateHooks } from "../services/settings-store";

const bucketOf = (ctx: Context) => bucketLocationOf(ctx).bucketName;

/** Plain `http://localhost` is allowed outside production, so a local request catcher can stand in for a site. */
const isAllowedUrl = (url: URL) =>
	url.protocol === "https:" ||
	(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost");

const requireUrl = (value: unknown): string => {
	const url = typeof value === "string" ? URL.parse(value) : null;
	if (!url || !isAllowedUrl(url)) throw badRequest("URL must be a valid https URL");
	return value as string;
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

const findHook = async (ctx: Context): Promise<StoredHook> => {
	const hook = hooksOf(await readSettings(), bucketOf(ctx)).find(({ id }) => id === ctx.req.param("id"));
	if (!hook) throw new HTTPException(404, { message: "No such hook" });
	return hook;
};

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
		await findHook(ctx);
		return updateHooks(bucketOf(ctx), (hooks) => {
			const current = hooks.find(({ id }) => id === ctx.req.param("id")) as StoredHook;
			const next = {
				...current,
				...(body.name !== undefined && { name: requireName(body.name) }),
				...(body.url !== undefined && { url: requireUrl(body.url) }),
			};
			return { hooks: hooks.map((hook) => (hook === current ? next : hook)), result: present(next) };
		});
	});

export const deleteHookHandler = (ctx: Context) =>
	respond<DeleteHookResponse>(ctx, async () => {
		const { id } = await findHook(ctx);
		await updateHooks(bucketOf(ctx), (hooks) => ({ hooks: hooks.filter((hook) => hook.id !== id), result: null }));
		forgetHook(id);
		return { id };
	});

export const testHookHandler = (ctx: Context) =>
	respond<HookFired>(ctx, async () => fireHook(bucketOf(ctx), await findHook(ctx)));

export const deployHandler = (ctx: Context) =>
	respond<DeployResponse>(ctx, async () => ({ results: await deployBucket(bucketOf(ctx)) }));
