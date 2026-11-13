import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredHook = { id: string; name: string; url: string };

export type Settings = { buckets: Record<string, { hooks: StoredHook[] }> };

const settingsPath = () => process.env.SETTINGS_PATH ?? "/data/settings.json";

/** Never puts file content in the error, since it holds secret URLs. */
export const readSettings = async (): Promise<Settings> => {
	let text: string;
	try {
		text = await readFile(settingsPath(), "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { buckets: {} };
		throw error;
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error("Settings file is not valid JSON");
	}
};

/** Written beside the target and renamed into place, so a crash never leaves a half-written file. */
export const writeSettings = async (settings: Settings): Promise<void> => {
	const file = settingsPath();
	const temp = `${file}.tmp`;
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(temp, JSON.stringify(settings, null, 2), { mode: 0o600 });
	await rename(temp, file);
};

export const hooksOf = (settings: Settings, bucket: string): StoredHook[] => settings.buckets[bucket]?.hooks ?? [];

/** Calls queue up, so concurrent edits neither lose each other's changes nor share the temp file. */
let queue: Promise<unknown> = Promise.resolve();

export const updateHooks = <Result>(
	bucket: string,
	change: (hooks: StoredHook[]) => { hooks: StoredHook[]; result: Result },
): Promise<Result> => {
	const run = queue.then(async () => {
		const settings = await readSettings();
		const { hooks, result } = change(hooksOf(settings, bucket));
		settings.buckets[bucket] = { hooks };
		await writeSettings(settings);
		return result;
	});
	queue = run.catch(() => {});
	return run;
};
