import type { Point } from "@/hooks/usePointerPosition";
import type { ApiError } from "@/lib/ofetch";
import { IMAGE_VARIANTS, INLINE_VARIANTS } from "~/shared/constants/image-variants";
import { type SizeState, sizeStatuses } from "~/shared/image-sizes";
import type { ImageVariant, Manifest, TreeNode } from "~/shared/types";

const DEPTH_INDENT_PX = 16;
const DEPTH_BASE_OFFSET_PX = 8;

export const getDepthPadding = (depth: number) => `${depth * DEPTH_INDENT_PX + DEPTH_BASE_OFFSET_PX}px`;

/** The trimmed, lower-cased form of a filter box's text; empty means no filter. */
export const filterNeedle = (query: string) => query.trim().toLowerCase();

/** Whether a name contains the needle from `filterNeedle`, ignoring case. */
export const matchesFilter = (name: string, needle: string) => name.toLowerCase().includes(needle);

export const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1];

/** The size a variant file is named for, e.g. `small_photo.webp`; falls back to the text before the first underscore for files outside the table. */
export const variantOf = (fileName: string): string =>
	IMAGE_VARIANTS.find((variant) => fileName.startsWith(`${variant}_`)) ?? fileName.split("_")[0];

/** Position of a size in the size table, smallest first; a name outside the table ranks last. */
export const sizeRank = (name: string) => {
	const rank = (IMAGE_VARIANTS as readonly string[]).indexOf(name);
	return rank === -1 ? IMAGE_VARIANTS.length : rank;
};

/** The file's extension in capitals, which names its type; `"unknown"` without one. */
export const fileType = (fileName: string): string => {
	const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
	return extension ? extension.toUpperCase() : "unknown";
};

/** The sizes the manifest expects to be stored, with how many are missing or mismatched. */
export const summariseSizes = (manifest: Manifest) => {
	const statuses = sizeStatuses(manifest).filter(({ state }) => state !== "notApplicable");
	const count = (wanted: SizeState) => statuses.filter(({ state }) => state === wanted).length;
	return { statuses, missing: count("missing"), mismatched: count("mismatched") };
};

/** Largest inline size first, as `full` is a far bigger download; the icon-sized thumbnail beats only the blurred placeholder. */
export const PREVIEW_ORDER: ImageVariant[] = [...INLINE_VARIANTS.toReversed(), "full", "thumbnail", "placeholder"];

/** Picks the variant to preview; a set may lack any size its source was too small for. */
export const pickPreviewVariant = (
	variants: TreeNode[],
	order: ImageVariant[] = PREVIEW_ORDER,
): TreeNode | undefined => {
	for (const wanted of order) {
		const found = variants.find((variant) => variant.name.startsWith(`${wanted}_`));
		if (found) return found;
	}
};

const qualify = (text: string | undefined, partial: boolean) =>
	text === undefined ? "unknown" : partial ? `at least ${text}` : text;

/** A fixed locale, so the server render and the browser agree on the separator. */
const COUNT_FORMAT = new Intl.NumberFormat("en");

/** A count with the right plural; `undefined` means it was never counted, and `partial` that it is a lower bound. */
export const formatCount = (count: number | undefined, noun: string | undefined, partial: boolean) =>
	qualify(
		count === undefined
			? undefined
			: noun
				? `${COUNT_FORMAT.format(count)} ${count === 1 ? noun : `${noun}s`}`
				: COUNT_FORMAT.format(count),
		partial,
	);

/** A display size such as `"113.09 kB"`; `undefined` means it was never counted, and `partial` that it is a lower bound. */
export const formatSize = (size: string | undefined, partial: boolean) => qualify(size, partial);

/** The server's own `{ error }` text, which says what went wrong, over ofetch's message, which only names the request. */
export const serverErrorMessage = (error: ApiError, fallback = "Something went wrong. Try again shortly.") =>
	error.data?.error ?? fallback;

/** The path collections record for a set: its folder (a tree `parentId`, which ends in a slash) without the slash. */
export const setPathOf = (folderId: string) => folderId.replace(/\/$/, "");

/** A folder is an image set when every child is a variant file named after it. */
export const isSetFolder = (node: TreeNode, children: TreeNode[] = []) =>
	node.isFolder && children.length > 0 && children.every((child) => extractFilename(child.name) === node.name);

/** The set folders at or below `folderId`, in tree order. */
export const setFoldersUnder = (childMap: Map<string, TreeNode[]>, folderId: string): TreeNode[] =>
	(childMap.get(folderId) ?? []).flatMap((node) => {
		if (!node.isFolder) return [];
		return isSetFolder(node, childMap.get(node.id)) ? [node] : setFoldersUnder(childMap, node.id);
	});

/** The set folders directly inside `folderId`, not those in its subfolders. */
export const setFoldersIn = (childMap: Map<string, TreeNode[]>, folderId: string): TreeNode[] =>
	(childMap.get(folderId) ?? []).filter((node) => isSetFolder(node, childMap.get(node.id)));

/** The sets inside a folder (`""` for the bucket root), found by folder id prefix. */
export const setsUnder = (sets: ReadonlyMap<string, TreeNode>, folderId: string) =>
	[...sets].filter(([, folder]) => folder.id.startsWith(folderId)).map(([set]) => set);

export const pickedInTreeOrder = (sets: ReadonlyMap<string, TreeNode>, picked: ReadonlySet<string>) =>
	[...sets].filter(([set]) => picked.has(set));

/** Ticks every set of a group, or clears the group when all of it is already ticked. */
export const toggleSets = (picked: ReadonlySet<string>, group: string[]) => {
	const next = new Set(picked);
	const all = group.every((set) => next.has(set));
	for (const set of group) {
		if (all) next.delete(set);
		else next.add(set);
	}
	return next;
};

export type Size = { width: number; height: number };

/** Flips rather than clamps, so the box never covers the cursor. */
export const placeBesideCursor = (cursor: Point, box: Size, viewport: Size, gap = 16): Point => ({
	x: cursor.x + gap + box.width > viewport.width ? Math.max(0, cursor.x - gap - box.width) : cursor.x + gap,
	y: cursor.y + gap + box.height > viewport.height ? Math.max(0, cursor.y - gap - box.height) : cursor.y + gap,
});

export const PREVIEW_SHAPES = ["square", "landscape", "portrait"] as const;
export type PreviewShape = (typeof PREVIEW_SHAPES)[number];

/** A box shape fixed from the thumbnail, so the box never resizes when the larger image swaps in. */
export const previewShapeOf = ({ width, height }: Size): PreviewShape =>
	width > height * 1.2 ? "landscape" : height > width * 1.2 ? "portrait" : "square";
