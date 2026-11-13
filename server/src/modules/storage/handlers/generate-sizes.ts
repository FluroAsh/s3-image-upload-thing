import type { Context } from "hono";

import { bucketLocationOf } from "@/shared/utils/params";
import { respond } from "@/shared/utils/respond";
import type { GenerateSizesResponse } from "~/shared/types";

import { generateMissingSizes } from "../services/generate-sizes";
import { requestedManifest } from "./get-manifest";

export const generateSizesHandler = (ctx: Context) =>
	respond<GenerateSizesResponse>(ctx, async () => ({
		generated: await generateMissingSizes(await requestedManifest(ctx), bucketLocationOf(ctx)),
	}));
