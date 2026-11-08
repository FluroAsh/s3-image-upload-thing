import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import type { Manifest } from "~/shared/types";

import { collectionsLocation } from "../services/collections";
import { locateSet, MANIFEST_FILE_NAME, NotAManifestError, nestedSetOf } from "../services/manifest";
import { readManifest } from "../services/s3-operations";
import { respond } from "./respond";

export const getManifestHandler = (ctx: Context) =>
	respond<Manifest>(ctx, async () => {
		const set = ctx.req.param("set");
		const { location, key } = locateSet(set, collectionsLocation());
		const identity = nestedSetOf(`${key}/${MANIFEST_FILE_NAME}`);
		try {
			const manifest = identity && (await readManifest(identity, location));
			if (manifest) return manifest;
		} catch (error) {
			if (error instanceof NotAManifestError) throw new HTTPException(422, { message: "Not a readable manifest" });
			throw error;
		}
		throw new HTTPException(404, { message: `No manifest for "${set}"` });
	});
