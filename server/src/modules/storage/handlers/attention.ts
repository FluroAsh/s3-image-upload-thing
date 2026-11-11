import type { Context } from "hono";

import type { AttentionResponse } from "~/shared/types";

import { listSetAttention } from "../services/attention";
import { bucketLocationOf } from "./params";
import { respond } from "./respond";

export const attentionHandler = (ctx: Context) =>
	respond<AttentionResponse>(ctx, () =>
		listSetAttention(bucketLocationOf(ctx), {
			folder: (ctx.req.query("folder") ?? "").replace(/^\/+|\/+$/g, ""),
			cursor: ctx.req.query("cursor"),
			all: ctx.req.query("all") === "true",
		}),
	);
