import type { MiddlewareHandler } from "hono";

import { UPLOAD_FIELD } from "~/shared/constants/upload";

import { markBucketChanged } from "./services/deploy-hooks";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Presigned URLs are a read, though they are requested with POST. */
const PRESIGNED_URLS_PATH = "/presigned-urls";

/** Uploads name their bucket in the form body; every other write names it in the query. */
const bucketOf = async (ctx: Parameters<MiddlewareHandler>[0]): Promise<string | undefined> => {
	const fromQuery = ctx.req.query("bucket");
	if (fromQuery) return fromQuery;
	if (!ctx.req.header("content-type")?.startsWith("multipart/")) return undefined;
	const body = await ctx.req.parseBody({ all: true }).catch((): Record<string, unknown> => ({}));
	const name = body[UPLOAD_FIELD.BucketName];
	return typeof name === "string" ? name : undefined;
};

/** Starts the bucket's deploy countdown after any successful write, so no handler has to. */
export const markBucketChangedOnWrite: MiddlewareHandler = async (ctx, next) => {
	await next();
	if (!WRITE_METHODS.has(ctx.req.method) || ctx.res.status < 200 || ctx.res.status >= 300) return;
	if (ctx.req.path.endsWith(PRESIGNED_URLS_PATH)) return;

	const bucket = await bucketOf(ctx);
	if (bucket) await markBucketChanged(bucket).catch((error) => console.error("Marking bucket changed failed", error));
};
