import { createHash } from "node:crypto";
import * as path from "node:path";

import sharp from "sharp";

import type { ImageVariant, Manifest, ManifestSource, ManifestVariant } from "~/shared/types";

import { DEFAULT_FILE_TYPE, DEFAULT_MIME_TYPE } from "../processors/variants/config";

/** What makes two keys part of the same image set. */
export type SetIdentity = Pick<Manifest, "layout" | "folder" | "name">;

type ClassifiedKey = SetIdentity & {
	/** Variant name taken from the key's prefix; `"original"` for an un-prefixed file. */
	variant: string;
};

/** Why a bucket key is not part of any image set. */
export const SKIP_REASONS = ["reserved-prefix", "folder-marker", "set-manifest", "not-webp", "empty-name"] as const;

type SkipReason = (typeof SKIP_REASONS)[number];

type ClassifyResult =
	| {
			/** The image set the key belongs to and its variant within it. */
			member: ClassifiedKey;
	  }
	| {
			/** The image set whose source file the key holds; never one of its sizes. */
			source: SetIdentity;
	  }
	| {
			/** Why the key belongs to no image set. */
			skip: SkipReason;
	  };

export type ImageSet = SetIdentity & {
	/** Key of the set's `original.{ext}`, the file its sizes are made from; absent when the set keeps none. */
	source?: string;
	/** Every key in the set, each with the variant name it holds. */
	members: {
		/** Bucket key of the object. */
		key: string;
		/** Variant name taken from the key's prefix; `"original"` for an un-prefixed file. */
		variant: string;
	}[];
};

export type SkippedKey = {
	/** Bucket key that was skipped. */
	key: string;
	/** Why it was skipped, for the backfill report. */
	reason: SkipReason;
};

type ManifestObject = Omit<ManifestVariant, "format"> & {
	/** Format the object was measured to hold; omitted means the one its key's extension claims. */
	format?: ManifestVariant["format"];
};

type BuildManifestParams = Pick<Manifest, "createdAt" | "placeholder" | "source"> & {
	/** Every object of exactly one image set. */
	objects: ManifestObject[];
};

/** File name of a set's manifest, stored directly inside the set's own folder. */
export const MANIFEST_FILE_NAME = "manifest.json";
/** Where only the service writes, so the classifier never mistakes its objects for image sets. */
const SERVICE_PREFIX = "src/";
/** The service prefix plus `legacy/`, which the CDN routes elsewhere, so an upload there would not be reachable at its own URL. */
const REFUSED_UPLOAD_PREFIXES = [SERVICE_PREFIX, "legacy/"] as const;
/** Start of a set's source file name, `original.{ext}`, which the bucket policy keeps from the CDN. */
const SOURCE_FILE_STEM = "original.";
/** File extension of every key the classifier accepts, dot included. */
export const EXTENSION = `.${DEFAULT_FILE_TYPE}`;

export const setId = ({ layout, folder, name }: SetIdentity): string => JSON.stringify([layout, folder, name]);

/** Also any folder named `original.…`, since the bucket policy hides every key with `/original.` in it from the CDN, and a set's sizes must stay public. */
export const hasRefusedUploadPrefix = (key: string): boolean =>
	REFUSED_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
	key.split("/").some((segment) => segment.startsWith(SOURCE_FILE_STEM));

/** A set in its own folder, which is the only kind that holds a manifest. */
export type NestedSetIdentity = Omit<SetIdentity, "layout">;

/** Only a nested set has a folder of its own to hold a manifest. */
export const holdsManifest = ({ layout }: SetIdentity): boolean => layout === "nested";

/** The one place an upload's set identity is derived, so the pre-check, variant keys and manifest agree. */
export const uploadSetIdentity = (destination: string, fileName: string): NestedSetIdentity => ({
	folder: destination,
	name: path.parse(fileName).name,
});

/** The set's own folder as a key prefix: every variant of an uploaded set and its manifest are stored under it. */
export const setKeyPrefix = ({ folder, name }: NestedSetIdentity): string =>
	folder ? `${folder}/${name}/` : `${name}/`;

/** The nested set a key inside a set folder (`{folder}/{name}/{file}`) would belong to; `undefined` when its parent folder has no name. */
const nestedSetOf = (key: string): NestedSetIdentity | undefined => {
	const segments = key.split("/");
	const name = segments[segments.length - 2];
	return name ? { folder: segments.slice(0, -2).join("/"), name } : undefined;
};

/** The variant a file stem holds within the set named `name`, or `undefined` when the stem is not that set's. */
const nestedVariant = (stem: string, name: string): string | undefined => {
	if (stem === name) return "original";
	if (stem.length > name.length + 1 && stem.endsWith(`_${name}`)) return stem.slice(0, -name.length - 1);
};

/**
 * The one rule for "this file belongs to the set folder it sits in": it is directly in `{folder}/{name}/` beside one of that set's images.
 * The same file name anywhere else (a web app's manifest.json, say) is an ordinary file.
 */
// ponytail: scans every sibling per key, quadratic in the listing; index siblings by folder before a bucket reaches the hundreds of thousands.
const isInSetFolder = (key: string, siblings: ReadonlySet<string>): boolean => {
	const folderKey = key.slice(0, key.lastIndexOf("/") + 1);
	const name = nestedSetOf(key)?.name;
	if (!name) return false;

	return Array.from(siblings).some((sibling) => {
		const fileName = sibling.slice(folderKey.length);
		return (
			sibling.startsWith(folderKey) &&
			!fileName.includes("/") &&
			fileName.endsWith(EXTENSION) &&
			nestedVariant(fileName.slice(0, -EXTENSION.length), name) !== undefined
		);
	});
};

export const isSetManifest = (key: string, siblings: ReadonlySet<string>): boolean =>
	key.endsWith(`/${MANIFEST_FILE_NAME}`) && isInSetFolder(key, siblings);

/** The key an upload stores a set's original under; `extension` is lower-cased so one policy pattern matches every original. */
export const sourceKey = (set: NestedSetIdentity, extension: string): string =>
	`${setKeyPrefix(set)}${SOURCE_FILE_STEM}${extension.toLowerCase()}`;

/** Shared by the upload path and the backfill, so both measure an original the same way: after EXIF rotation, as displayed. */
export const describeSource = async (key: string, body: Buffer): Promise<ManifestSource> => {
	const { autoOrient } = await sharp(body).metadata();
	const sha256 = createHash("sha256").update(body).digest("hex");

	return { key, public: false, sha256, bytes: body.length, ...autoOrient };
};

/** Whether a key is `original.{ext}`, any extension, in the folder of a set; the bucket policy keeps every such key from the CDN. */
export const isSetSource = (key: string, siblings: ReadonlySet<string>): boolean => {
	const fileName = key.slice(key.lastIndexOf("/") + 1);
	return fileName.startsWith(SOURCE_FILE_STEM) && fileName !== SOURCE_FILE_STEM && isInSetFolder(key, siblings);
};

/** The key an upload stores one variant of a set under; the one place that shape is written. */
export const variantKey = (location: NestedSetIdentity, variant: ImageVariant): string =>
	`${setKeyPrefix(location)}${variant}_${location.name}${EXTENSION}`;

/**
 * `siblings` is every key that could sit beside it, normally the whole bucket listing.
 * A flat file's text before its first underscore is a variant prefix only if the rest of the name exists beside it.
 */
export const classifyKey = (key: string, siblings: ReadonlySet<string>): ClassifyResult => {
	if (key.startsWith(SERVICE_PREFIX)) return { skip: "reserved-prefix" };
	if (key.endsWith("/")) return { skip: "folder-marker" };
	if (isSetManifest(key, siblings)) return { skip: "set-manifest" };
	const nestedSet = nestedSetOf(key);
	if (nestedSet && isSetSource(key, siblings)) return { source: { layout: "nested", ...nestedSet } };
	if (!key.endsWith(EXTENSION)) return { skip: "not-webp" };

	const segments = key.split("/");
	const stem = segments[segments.length - 1].slice(0, -EXTENSION.length);
	if (!stem) return { skip: "empty-name" };

	const nested = nestedSet && nestedVariant(stem, nestedSet.name);
	if (nestedSet && nested) return { member: { layout: "nested", ...nestedSet, variant: nested } };

	const folder = segments.slice(0, -1).join("/");
	const separator = stem.indexOf("_");

	if (separator > 0) {
		const name = stem.slice(separator + 1);
		const original = [...segments.slice(0, -1), `${name}${EXTENSION}`].join("/");

		if (siblings.has(original)) return { member: { layout: "flat", folder, name, variant: stem.slice(0, separator) } };
	}

	return { member: { layout: "flat", folder, name: stem, variant: "original" } };
};

/** Splits a bucket listing into image sets, in first-seen order, and the keys that belong to none. */
export const groupImageSets = (keys: readonly string[]): { sets: ImageSet[]; skipped: SkippedKey[] } => {
	const siblings = new Set(keys);
	const sets = new Map<string, ImageSet>();
	const skipped: SkippedKey[] = [];
	const groupFor = (identity: SetIdentity): ImageSet => {
		const group = sets.get(setId(identity)) ?? { ...identity, members: [] };
		sets.set(setId(identity), group);
		return group;
	};

	for (const key of keys) {
		const result = classifyKey(key, siblings);
		if ("skip" in result) {
			skipped.push({ key, reason: result.skip });
			continue;
		}

		if ("source" in result) {
			groupFor(result.source).source ??= key;
			continue;
		}

		const { variant, ...identity } = result.member;
		groupFor(identity).members.push({ key, variant });
	}

	return { sets: Array.from(sets.values()), skipped };
};

/** The form a manifest's `placeholder` takes, given the bytes of a blurred placeholder variant. */
export const placeholderDataUri = (placeholder: Buffer): string =>
	`data:${DEFAULT_MIME_TYPE};base64,${placeholder.toString("base64")}`;

/** Beside the set's images, so a consumer finds it from any image URL of the set and deleting the folder removes it too. */
export const manifestKey = (set: NestedSetIdentity): string => `${setKeyPrefix(set)}${MANIFEST_FILE_NAME}`;

/** A write sees one key, not its siblings, so this is a shape rule: `manifest.json` directly inside a non-empty folder, outside the service prefix. */
const hasManifestKeyShape = (key: string): boolean => {
	const segments = key.split("/");
	return (
		segments.length >= 2 &&
		segments.every(Boolean) &&
		segments[segments.length - 1] === MANIFEST_FILE_NAME &&
		!key.startsWith(SERVICE_PREFIX)
	);
};

/** Checked where a manifest is stored, so no caller or later change to the key can make that write land on an image. */
export const assertManifestKey = (key: string): void => {
	if (!hasManifestKeyShape(key)) {
		throw new Error(
			`Refusing to write "${key}": a manifest is only stored as ${MANIFEST_FILE_NAME} inside its set's folder`,
		);
	}
};

/** Whether something read from a manifest key is a manifest this service wrote, so a foreign file there is never trusted or replaced. */
export const isManifest = (value: unknown): value is Manifest => {
	if (typeof value !== "object" || value === null) return false;
	const { schema, variants } = value as Partial<Record<keyof Manifest, unknown>>;
	return schema === 1 && typeof variants === "object" && variants !== null && !Array.isArray(variants);
};

/** Thrown when the key where a set's manifest belongs holds a file that is not one. */
export class NotAManifestError extends Error {
	constructor(key: string) {
		super(`a file that is not a set manifest occupies ${key} and was not replaced`);
	}
}

/** Shared by the upload path and the backfill, so the two cannot describe the same objects differently. */
export const buildManifest = (params: BuildManifestParams): Manifest => {
	const { createdAt, placeholder, source, objects } = params;

	const siblings = new Set(objects.map(({ key }) => key));
	const variants: Manifest["variants"] = {};
	let identity: SetIdentity | undefined;

	for (const object of objects) {
		const result = classifyKey(object.key, siblings);
		if (!("member" in result)) {
			throw new Error(
				`"${object.key}" is not one of an image set's sizes (${"skip" in result ? result.skip : "source"})`,
			);
		}

		const { variant, ...memberIdentity } = result.member;
		identity ??= memberIdentity;
		if (setId(memberIdentity) !== setId(identity)) {
			throw new Error(`"${object.key}" does not belong to the same image set as "${objects[0].key}"`);
		}

		const { key, format = DEFAULT_FILE_TYPE, width, height, bytes, etag } = object;
		variants[variant] = { key, format, width, height, bytes, etag };
	}

	if (!identity) throw new Error("An image set needs at least one object");
	if (!holdsManifest(identity))
		throw new Error(`Cannot build a manifest for flat set "${identity.name}": it has no folder of its own`);

	// Only `original.{ext}` inside the set's folder is denied to the CDN, so any other key would make `public: false` untrue.
	if (source) {
		const classified = classifyKey(source.key, siblings);
		if (!("source" in classified) || setId(classified.source) !== setId(identity)) {
			throw new Error(`"${source.key}" is not the source file of set "${identity.name}"`);
		}
	}

	return {
		schema: 1,
		name: identity.name,
		folder: identity.folder,
		layout: identity.layout,
		status: "ready",
		createdAt,
		placeholder,
		source,
		variants,
	};
};
