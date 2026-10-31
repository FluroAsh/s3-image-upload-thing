import * as path from "node:path";

import type { ImageVariant, Manifest, ManifestVariant } from "~/shared/types";

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
			/** Why the key belongs to no image set. */
			skip: SkipReason;
	  };

export type ImageSet = SetIdentity & {
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

type BuildManifestParams = Pick<Manifest, "createdAt" | "placeholder"> & {
	/** Every object of exactly one image set. */
	objects: ManifestObject[];
};

/** File name of a set's manifest, stored directly inside the set's own folder. */
export const MANIFEST_FILE_NAME = "manifest.json";
/** Where only the service writes, so the classifier never mistakes its objects for image sets. */
const SERVICE_PREFIX = "src/";
/** The service prefix plus `legacy/`, which the CDN routes elsewhere, so an upload there would not be reachable at its own URL. */
const REFUSED_UPLOAD_PREFIXES = [SERVICE_PREFIX, "legacy/"] as const;
/** File extension of every key the classifier accepts, dot included. */
export const EXTENSION = `.${DEFAULT_FILE_TYPE}`;

export const setId = ({ layout, folder, name }: SetIdentity): string => JSON.stringify([layout, folder, name]);

export const hasRefusedUploadPrefix = (key: string): boolean =>
	REFUSED_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));

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

/** The variant a file stem holds within the set named `name`, or `undefined` when the stem is not that set's. */
const nestedVariant = (stem: string, name: string): string | undefined => {
	if (stem === name) return "original";
	if (stem.length > name.length + 1 && stem.endsWith(`_${name}`)) return stem.slice(0, -name.length - 1);
};

/**
 * The one rule for "this manifest.json is a set's manifest": it sits in `{folder}/{name}/` beside one of that set's images.
 * Any other manifest.json (a web app's, say) is an ordinary file.
 */
// ponytail: scans every sibling per manifest, quadratic in the listing; index siblings by folder before a bucket reaches the hundreds of thousands.
export const isSetManifest = (key: string, siblings: ReadonlySet<string>): boolean => {
	if (!key.endsWith(`/${MANIFEST_FILE_NAME}`)) return false;

	const folderKey = key.slice(0, -MANIFEST_FILE_NAME.length);
	const folderSegments = folderKey.split("/");
	const name = folderSegments[folderSegments.length - 2];
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
	if (!key.endsWith(EXTENSION)) return { skip: "not-webp" };

	const segments = key.split("/");
	const stem = segments[segments.length - 1].slice(0, -EXTENSION.length);
	if (!stem) return { skip: "empty-name" };

	const parent: string | undefined = segments[segments.length - 2];
	const nested = parent ? nestedVariant(stem, parent) : undefined;
	if (parent && nested) {
		return { member: { layout: "nested", folder: segments.slice(0, -2).join("/"), name: parent, variant: nested } };
	}

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

	for (const key of keys) {
		const result = classifyKey(key, siblings);
		if ("skip" in result) {
			skipped.push({ key, reason: result.skip });
			continue;
		}

		const { variant, ...identity } = result.member;
		const group = sets.get(setId(identity)) ?? { ...identity, members: [] };
		group.members.push({ key, variant });
		sets.set(setId(identity), group);
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
	const { createdAt, placeholder, objects } = params;

	const siblings = new Set(objects.map(({ key }) => key));
	const variants: Manifest["variants"] = {};
	let identity: SetIdentity | undefined;

	for (const object of objects) {
		const result = classifyKey(object.key, siblings);
		if ("skip" in result) throw new Error(`"${object.key}" is not part of an image set (${result.skip})`);

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

	return {
		schema: 1,
		name: identity.name,
		folder: identity.folder,
		layout: identity.layout,
		status: "ready",
		createdAt,
		placeholder,
		source: null,
		variants,
	};
};
