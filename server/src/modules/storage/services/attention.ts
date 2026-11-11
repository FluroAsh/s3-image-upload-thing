import { IMAGE_VARIANTS } from "~/shared/constants/image-variants";
import { sizeStatuses } from "~/shared/image-sizes";
import type { AttentionResponse, BucketLocation, SetAttention } from "~/shared/types";

import { groupImageSets, type ImageSet, NotAManifestError } from "./manifest";
import { listPages, readManifest } from "./s3-operations";

/** Manifests read at once; small enough not to flood S3 or the server, large enough that a folder of hundreds of sets takes seconds. */
const MANIFEST_READS = 16;

const PAGE_SIZE = 50;

type AttentionQuery = {
	/** Folder holding the sets, without a trailing slash; `""` for the bucket root. */
	folder: string;
	/** Name of the last set of the previous page. */
	cursor?: string;
	/** Keep sets that need nothing too. */
	all?: boolean;
};

const compareNames = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

const attentionOf = async (set: ImageSet, location: BucketLocation): Promise<SetAttention> => {
	const path = set.folder ? `${set.folder}/${set.name}` : set.name;
	const row = { name: set.name, set: path, hasOriginal: Boolean(set.source) };

	try {
		const stored = await readManifest(set, location);
		if (stored) {
			const problems = sizeStatuses(stored).filter(({ state }) => state === "missing" || state === "mismatched");
			return {
				...row,
				manifest: "present",
				problems: problems.map(({ name, state, reason }) => ({ name, state, reason })),
			};
		}
		const held = new Set(set.members.map(({ variant }) => variant));
		const problems = IMAGE_VARIANTS.filter((name) => !held.has(name)).map((name) => ({
			name,
			state: "missing" as const,
		}));
		return { ...row, manifest: "none", problems };
	} catch (error) {
		if (!(error instanceof NotAManifestError)) throw error;
		return { ...row, manifest: "notAManifest", problems: [] };
	}
};

/** Lists one folder once, then reads manifests a few at a time until a page of rows is found, so a folder of hundreds of sets costs one listing plus bounded reads. */
export const listSetAttention = async (
	location: BucketLocation,
	{ folder, cursor, all = false }: AttentionQuery,
): Promise<AttentionResponse> => {
	const keys: string[] = [];
	const { partial } = await listPages(
		location,
		(objects) => keys.push(...objects.flatMap(({ Key }) => (Key ? [Key] : []))),
		{
			prefix: folder ? `${folder}/` : undefined,
		},
	);

	const inFolder = groupImageSets(keys)
		.sets.filter((set) => set.folder === folder)
		.sort((a, b) => compareNames(a.name, b.name));
	const remaining = cursor === undefined ? inFolder : inFolder.filter((set) => compareNames(cursor, set.name) < 0);

	const rows: SetAttention[] = [];
	for (let start = 0; start < remaining.length; start += MANIFEST_READS) {
		const batch = remaining.slice(start, start + MANIFEST_READS);
		const checked = await Promise.all(batch.map((set) => attentionOf(set, location)));

		for (const row of checked) {
			if (!all && row.manifest === "present" && row.problems.length === 0) continue;
			rows.push(row);
			if (rows.length === PAGE_SIZE) {
				const isLast = row.name === remaining[remaining.length - 1].name;
				return { sets: rows, nextCursor: isLast ? null : row.name, total: inFolder.length, partial };
			}
		}
	}

	return { sets: rows, nextCursor: null, total: inFolder.length, partial };
};
