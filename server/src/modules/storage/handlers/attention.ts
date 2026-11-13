import type { Context } from "hono";

import { bucketLocationOf } from "@/shared/utils/params";
import { respond } from "@/shared/utils/respond";
import type { AttentionResponse } from "~/shared/types";

import { listSetAttention } from "../services/attention";

export const attentionHandler = (ctx: Context) =>
	respond<AttentionResponse>(ctx, () =>
		listSetAttention(bucketLocationOf(ctx), {
			folder: (ctx.req.query("folder") ?? "").replace(/^\/+|\/+$/g, ""),
			cursor: ctx.req.query("cursor"),
			all: ctx.req.query("all") === "true",
		}),
	);
