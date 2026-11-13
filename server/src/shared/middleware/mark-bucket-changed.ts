import type { Context, MiddlewareHandler } from "hono";

import { markBucketChanged } from "@/modules/settings/services/deploy-hooks";
import { errorMessage } from "@/shared/utils/helpers";
import { UPLOAD_FIELD } from "~/shared/constants/upload";
import type { UploadResponse } from "~/shared/types";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Presigned URLs are a read, though they are requested with POST. */
const PRESIGNED_URLS_PATH = "/presigned-urls";

const UPLOAD_PATH = "/upload";

/** Uploads name their bucket in the form body; every other write names it in the query. */
const writtenBucketOf = async (ctx: Context): Promise<string | undefined> => {
	const fromQuery = ctx.req.query("bucket");
	if (fromQuery) return fromQuery;
	if (!ctx.req.header("content-type")?.startsWith("multipart/")) return undefined;
	const body = await ctx.req.parseBody({ all: true }).catch((): Record<string, unknown> => ({}));
	const name = body[UPLOAD_FIELD.BucketName];
	return typeof name === "string" ? name : undefined;
};

/** An upload answers 200 even when every file was refused or failed, so only its results say whether anything was stored. */
const storedNothing = async (ctx: Context): Promise<boolean> => {
	if (!ctx.req.path.endsWith(UPLOAD_PATH)) return false;
	const body: UploadResponse | null = await ctx.res
		.clone()
		.json()
		.catch(() => null);
	return !body?.results?.some(({ status }) => status === "stored");
};

/** Starts the bucket's deploy countdown after any successful write, so no handler has to. */
export const markBucketChangedOnWrite: MiddlewareHandler = async (ctx, next) => {
	await next();
	if (!WRITE_METHODS.has(ctx.req.method) || ctx.res.status < 200 || ctx.res.status >= 300) return;
	if (ctx.req.path.endsWith(PRESIGNED_URLS_PATH) || (await storedNothing(ctx))) return;

	const bucket = await writtenBucketOf(ctx);
	if (bucket) {
		void markBucketChanged(bucket).catch((error) =>
			console.error("Marking bucket changed failed:", errorMessage(error, "error")),
		);
	}
};
