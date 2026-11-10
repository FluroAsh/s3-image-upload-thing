import type { Context } from "hono";

import type { GenerateSizesResponse } from "~/shared/types";

import { generateMissingSizes } from "../services/generate-sizes";
import { requestedManifest } from "./get-manifest";
import { bucketLocationOf } from "./params";
import { respond } from "./respond";

export const generateSizesHandler = (ctx: Context) =>
	respond<GenerateSizesResponse>(ctx, async () => ({
		generated: await generateMissingSizes(await requestedManifest(ctx), bucketLocationOf(ctx)),
	}));
