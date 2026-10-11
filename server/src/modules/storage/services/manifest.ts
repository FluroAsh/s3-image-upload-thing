import * as path from "node:path";

import type { Manifest, ManifestVariant } from "~/shared/types";

import { VARIANT_NAMES } from "../processors/variants/config";

export type ClassifiedKey = Pick<Manifest, "layout" | "folder" | "name"> & { variant: string };

/** A listed object plus its measured dimensions. */
export type ManifestObject = Omit<ManifestVariant, "format">;

export type BuildManifestParams = Pick<Manifest, "bucket" | "pathPrefix" | "createdAt" | "placeholder" | "source"> & {
	/** Every object of exactly one image set. */
	objects: ManifestObject[];
};

const RESERVED_PREFIXES = ["manifests/", "src/"];
const VARIANT_EXTENSION = ".webp";

// A flat name can itself contain underscores, so only these count as a variant prefix; `thumbnail` is the legacy size.
const FLAT_VARIANT_PREFIXES: readonly string[] = [...VARIANT_NAMES, "thumbnail"];

/**
 * Decides which image set a bucket key belongs to; `null` means it belongs to none.
 * `siblings` is every key that could sit beside it, normally the whole bucket listing.
 */
export const classifyKey = (key: string, siblings: ReadonlySet<string>): ClassifiedKey | null => {
	if (RESERVED_PREFIXES.some((prefix) => key.startsWith(prefix))) return null;
	if (!key.endsWith(VARIANT_EXTENSION)) return null;

	const segments = key.split("/");
	const stem = segments[segments.length - 1].slice(0, -VARIANT_EXTENSION.length);
	const parent: string | undefined = segments[segments.length - 2];
	if (!stem) return null;

	if (parent && stem.length > parent.length + 1 && stem.endsWith(`_${parent}`)) {
		return {
			layout: "nested",
			folder: segments.slice(0, -2).join("/"),
			name: parent,
			variant: stem.slice(0, -parent.length - 1),
		};
	}

	const folder = segments.slice(0, -1).join("/");
	const [prefix, ...rest] = stem.split("_");

	if (!rest.length || !FLAT_VARIANT_PREFIXES.includes(prefix)) {
		return { layout: "flat", folder, name: stem, variant: "original" };
	}

	// A prefix alone proves nothing: small_talk.webp is its own photo unless talk.webp sits beside it.
	const name = rest.join("_");
	const original = [...segments.slice(0, -1), `${name}${VARIANT_EXTENSION}`].join("/");

	return siblings.has(original) ? { layout: "flat", folder, name, variant: prefix } : null;
};

/** Manifests for every bucket live in the primary bucket, the only place the CDN serves `manifests/` from. */
export const manifestKey = ({ pathPrefix, folder, name }: Pick<Manifest, "pathPrefix" | "folder" | "name">): string =>
	`manifests/${pathPrefix}${folder ? `${folder}/` : ""}${name}.json`;

/** Shared by the upload path and the backfill, so the two cannot describe the same objects differently. */
export const buildManifest = (params: BuildManifestParams): Manifest => {
	const { bucket, pathPrefix, createdAt, placeholder, source, objects } = params;
	const siblings = new Set(objects.map(({ key }) => key));
	const variants: Manifest["variants"] = {};
	let set: ClassifiedKey | undefined;

	for (const object of objects) {
		const classified = classifyKey(object.key, siblings);
		if (!classified) throw new Error(`"${object.key}" is not part of an image set`);

		set ??= classified;
		if (classified.layout !== set.layout || classified.folder !== set.folder || classified.name !== set.name) {
			throw new Error(`"${object.key}" does not belong to the same image set as "${objects[0].key}"`);
		}

		const { key, width, height, bytes, etag } = object;
		variants[classified.variant] = { key, format: path.extname(key).slice(1), width, height, bytes, etag };
	}

	if (!set) throw new Error("An image set needs at least one object");

	return {
		schema: 1,
		name: set.name,
		folder: set.folder,
		bucket,
		pathPrefix,
		layout: set.layout,
		status: "ready",
		createdAt,
		placeholder,
		source,
		variants,
	};
};
