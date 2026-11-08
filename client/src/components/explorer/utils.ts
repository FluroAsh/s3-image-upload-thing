import type { ApiError } from "@/lib/ofetch";
import { INLINE_VARIANTS } from "~/shared/constants/image-variants";
import type { Collection, ImageVariant, TreeNode } from "~/shared/types";

const DEPTH_INDENT_PX = 24;
const DEPTH_BASE_OFFSET_PX = 8;

export const getDepthPadding = (depth: number) => `${depth * DEPTH_INDENT_PX + DEPTH_BASE_OFFSET_PX}px`;

// Extracts the string between "_" and "." (ie: "large_filename.jpg" -> "filename")
export const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1];

export const getVariantType = (fileName: string) => {
	const variant = fileName.split("_")[0];
	return variant ? `${variant[0].toUpperCase()}${variant.slice(1)}` : "";
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

/** A count with the right plural; `undefined` means it was never counted, and `partial` that it is a lower bound. */
// A fixed locale, so the server render and the browser agree on the separator.
const COUNT_FORMAT = new Intl.NumberFormat("en");

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

export const FIELD_CLASS = "w-full rounded-lg bg-slate-700/60 border border-slate-600 p-2 text-sm text-neutral-100";

/** The CDN path collections record for a set: the bucket's CDN prefix plus the set's folder (a tree `parentId`, which ends in a slash). */
export const setPathOf = (cdnPrefix: string, folderId: string) => `${cdnPrefix}${folderId.replace(/\/$/, "")}`;

/** A folder is an image set when every child is a variant file named after it. */
export const isSetFolder = (node: TreeNode, children: TreeNode[] = []) =>
	node.isFolder && children.length > 0 && children.every((child) => extractFilename(child.name) === node.name);

/** The set folders at or below `folderId`, in tree order. */
export const setFoldersUnder = (childMap: Map<string, TreeNode[]>, folderId: string): TreeNode[] =>
	(childMap.get(folderId) ?? []).flatMap((node) => {
		if (!node.isFolder) return [];
		return isSetFolder(node, childMap.get(node.id)) ? [node] : setFoldersUnder(childMap, node.id);
	});

/** A set belongs to a bucket when its folder is in the bucket's listing: the client knows only this bucket's CDN prefix, which cannot tell an unprefixed bucket's sets from another's. */
export const collectionsInBucket = (collections: Collection[], bucketSets: ReadonlyMap<string, TreeNode>) =>
	collections.filter((collection) => collection.photos.some((photo) => bucketSets.has(photo.set)));

/** The sets inside a folder (`""` for the bucket root), found by folder id prefix. */
export const setsUnder = (sets: ReadonlyMap<string, TreeNode>, folderId: string) =>
	[...sets].filter(([, folder]) => folder.id.startsWith(folderId)).map(([set]) => set);

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
