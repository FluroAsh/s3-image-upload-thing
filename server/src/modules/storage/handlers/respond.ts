import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { errorMessage } from "@/shared/utils/helpers";

export const badRequest = (message: string) => new HTTPException(400, { message });

/** Runs a handler body, answering an `HTTPException` with its own status and anything else as a logged 500. */
export const respond = async <Body>(ctx: Context, run: () => Promise<Body>, status: 200 | 201 = 200) => {
	try {
		return ctx.json(await run(), status);
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);

		console.error(error);
		return ctx.json({ error: errorMessage(error, "Request failed") }, 500);
	}
};
