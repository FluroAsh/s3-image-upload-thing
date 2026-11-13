import type { HookResult } from "./types";

/** Keeps a description to one line in the hook list. */
export const HOOK_DESCRIPTION_MAX = 120;

/** Plain `http://localhost` is allowed outside production, so a local request catcher can stand in for a site. */
export const isAllowedHookUrl = (url: URL) =>
	url.protocol === "https:" ||
	(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost");

export const isOk = ({ status }: HookResult) => status >= 200 && status < 300;
