import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { errorMessage } from "@/shared/utils/helpers";

export const badRequest = (message: string) => new HTTPException(400, { message });

export const readBody = async (ctx: Context): Promise<Record<string, unknown>> => {
	const body = await ctx.req.json().catch(() => null);
	if (typeof body !== "object" || body === null) throw badRequest("Body must be a JSON object");
	return body;
};

/** Runs a handler body, answering an `HTTPException` with its own status and anything else as a logged 500; a body that is already a `Response`, such as a redirect, is sent as is. */
export const respond = async <Body>(ctx: Context, run: () => Promise<Body>, status: 200 | 201 = 200) => {
	try {
		const body = await run();
		return body instanceof Response ? body : ctx.json(body, status);
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);

		console.error(error);
		return ctx.json({ error: errorMessage(error, "Request failed") }, 500);
	}
};
