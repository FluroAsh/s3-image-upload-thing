import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredHook = { id: string; name: string; url: string };

export type Settings = { buckets: Record<string, { hooks: StoredHook[] }> };

const settingsPath = () => process.env.SETTINGS_PATH ?? "/data/settings.json";

export const readSettings = async (): Promise<Settings> => {
	try {
		return JSON.parse(await readFile(settingsPath(), "utf8"));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { buckets: {} };
		throw error;
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

/** Reads the bucket's hooks, lets `change` edit the list, and saves it. */
export const updateHooks = async <Result>(
	bucket: string,
	change: (hooks: StoredHook[]) => { hooks: StoredHook[]; result: Result },
): Promise<Result> => {
	const settings = await readSettings();
	const { hooks, result } = change(hooksOf(settings, bucket));
	settings.buckets[bucket] = { hooks };
	await writeSettings(settings);
	return result;
};
