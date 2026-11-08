import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type { Manifest } from "~/shared/types";

import { collectionsLocation } from "../services/collections";
import { locateSet, MANIFEST_FILE_NAME } from "../services/manifest";
import { getObjectOrNull } from "../services/s3-operations";
import { respond } from "./respond";

export const getManifestHandler = (ctx: Context) =>
	respond<Manifest>(ctx, async () => {
		const set = ctx.req.param("set");
		const { location, key } = locateSet(set, collectionsLocation());
		const object = await getObjectOrNull(`${key}/${MANIFEST_FILE_NAME}`, location);
		if (!object) throw new HTTPException(404, { message: `No manifest for "${set}"` });
		return JSON.parse(object.body.toString("utf8"));
	});
