import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { bucketLocationOf } from "@/shared/utils/params";
import { respond } from "@/shared/utils/respond";
import type { Manifest } from "~/shared/types";

import { MANIFEST_FILE_NAME, NotAManifestError, nestedSetOf } from "../services/manifest";
import { readManifest } from "../services/s3-operations";

/** The manifest of the set named by the route, or the 404 or 422 a route answers when there is none to use. */
export const requestedManifest = async (ctx: Context): Promise<Manifest> => {
	const set = ctx.req.param("set");
	const location = bucketLocationOf(ctx);
	const identity = nestedSetOf(`${set}/${MANIFEST_FILE_NAME}`);
	try {
		const manifest = identity && (await readManifest(identity, location));
		if (manifest) return manifest;
	} catch (error) {
		if (error instanceof NotAManifestError) throw new HTTPException(422, { message: "Not a readable manifest" });
		throw error;
	}
	throw new HTTPException(404, { message: `No manifest for "${set}"` });
};

export const getManifestHandler = (ctx: Context) => respond<Manifest>(ctx, () => requestedManifest(ctx));
