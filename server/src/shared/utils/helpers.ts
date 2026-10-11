import fileSize from "file-size";

export const readableSize = (size: number, spec?: "si" | "iec" | "jedec") => fileSize(size).human(spec ?? "si");

/** What to show for a caught value, which JavaScript lets be anything; `fallback` stands in for one that is not an `Error`. */
export const errorMessage = (error: unknown, fallback = String(error)): string =>
	error instanceof Error ? error.message : fallback;
