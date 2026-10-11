import * as path from "node:path";

import type { Manifest, ManifestVariant } from "~/shared/types";

import { DEFAULT_FILE_TYPE, DEFAULT_MIME_TYPE } from "../processors/variants/config";

/** What makes two keys part of the same image set. */
export type SetIdentity = Pick<Manifest, "layout" | "folder" | "name">;

type ClassifiedKey = SetIdentity & {
	/** Variant name taken from the key's prefix; `"original"` for an un-prefixed file. */
	variant: string;
};

/** Why a bucket key is not part of any image set. */
export const SKIP_REASONS = ["reserved-prefix", "folder-marker", "not-webp", "empty-name"] as const;

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
	/** Required on a flat set's original, which becomes the manifest's source. */
	sha256?: string;
};

type BuildManifestParams = Pick<Manifest, "bucket" | "pathPrefix" | "createdAt" | "placeholder" | "source"> & {
	/** Every object of exactly one image set. */
	objects: ManifestObject[];
};

/** Key prefix every manifest is stored under. */
const MANIFEST_PREFIX = "manifests/";
/** Where only the service writes, so the classifier never mistakes its objects for image sets. */
const SERVICE_PREFIXES = [MANIFEST_PREFIX, "src/"] as const;
/** The service prefixes plus `legacy/`, where the CDN publishes the second bucket, so an upload there would collide in URLs. */
const REFUSED_UPLOAD_PREFIXES = [...SERVICE_PREFIXES, "legacy/"] as const;
/** File extension of every key the classifier accepts, dot included. */
export const EXTENSION = `.${DEFAULT_FILE_TYPE}`;

export const setId = ({ layout, folder, name }: SetIdentity): string => JSON.stringify([layout, folder, name]);

export const assertPathPrefix = (pathPrefix: string): void => {
	if (pathPrefix && !pathPrefix.endsWith("/")) throw new Error(`pathPrefix "${pathPrefix}" must end with "/"`);
};

export const hasRefusedUploadPrefix = (key: string): boolean =>
	REFUSED_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));

/** The part of a manifest that says which set it is and where it is stored. */
export type ManifestLocation = Pick<Manifest, "pathPrefix" | "folder" | "name">;

/** The one place an upload's set identity is derived, so the pre-check, variant keys and manifest agree. */
export const uploadSetIdentity = (destination: string, fileName: string): ManifestLocation => ({
	pathPrefix: "",
	folder: destination,
	name: path.parse(fileName).name,
});

/** Key prefix every variant of an uploaded set is stored under. */
export const setKeyPrefix = ({ folder, name }: ManifestLocation): string =>
	folder ? `${folder}/${name}/` : `${name}/`;

/**
 * `siblings` is every key that could sit beside it, normally the whole bucket listing.
 * A flat file's text before its first underscore is a variant prefix only if the rest of the name exists beside it.
 */
export const classifyKey = (key: string, siblings: ReadonlySet<string>): ClassifyResult => {
	if (SERVICE_PREFIXES.some((prefix) => key.startsWith(prefix))) return { skip: "reserved-prefix" };
	if (key.endsWith("/")) return { skip: "folder-marker" };
	if (!key.endsWith(EXTENSION)) return { skip: "not-webp" };

	const segments = key.split("/");
	const stem = segments[segments.length - 1].slice(0, -EXTENSION.length);
	const parent: string | undefined = segments[segments.length - 2];
	if (!stem) return { skip: "empty-name" };

	if (parent && stem === parent) {
		return { member: { layout: "nested", folder: segments.slice(0, -2).join("/"), name: parent, variant: "original" } };
	}

	if (parent && stem.length > parent.length + 1 && stem.endsWith(`_${parent}`)) {
		return {
			member: {
				layout: "nested",
				folder: segments.slice(0, -2).join("/"),
				name: parent,
				variant: stem.slice(0, -parent.length - 1),
			},
		};
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

/** Manifests for every bucket live in the primary bucket, the only place the CDN serves `manifests/` from. */
export const manifestKey = ({ pathPrefix, folder, name }: ManifestLocation): string => {
	assertPathPrefix(pathPrefix);
	return `${MANIFEST_PREFIX}${pathPrefix}${folder ? `${folder}/` : ""}${name}.json`;
};

/** Checked where a manifest is stored, so no caller or later change to the key can make that write land on an image. */
export const assertManifestKey = (key: string): void => {
	if (!key.startsWith(MANIFEST_PREFIX)) {
		throw new Error(`Refusing to write "${key}": manifests are only stored under ${MANIFEST_PREFIX}`);
	}
};

/** Shared by the upload path and the backfill, so the two cannot describe the same objects differently. */
export const buildManifest = (params: BuildManifestParams): Manifest => {
	const { bucket, pathPrefix, createdAt, placeholder, source, objects } = params;
	assertPathPrefix(pathPrefix);

	const siblings = new Set(objects.map(({ key }) => key));
	const variants: Manifest["variants"] = {};
	let identity: SetIdentity | undefined;
	let original: ManifestObject | undefined;

	for (const object of objects) {
		const result = classifyKey(object.key, siblings);
		if ("skip" in result) throw new Error(`"${object.key}" is not part of an image set (${result.skip})`);

		const { variant, ...memberIdentity } = result.member;
		identity ??= memberIdentity;
		if (setId(memberIdentity) !== setId(identity)) {
			throw new Error(`"${object.key}" does not belong to the same image set as "${objects[0].key}"`);
		}

		if (variant === "original") original = object;

		const { key, format = DEFAULT_FILE_TYPE, width, height, bytes, etag } = object;
		variants[variant] = { key, format, width, height, bytes, etag };
	}

	if (!identity) throw new Error("An image set needs at least one object");

	let manifestSource = source;
	if (identity.layout === "flat") {
		if (!original?.sha256) throw new Error(`Flat set "${identity.name}" needs an original with a sha256`);
		const { key, sha256, bytes, width, height } = original;
		manifestSource = { key, public: true, sha256, bytes, width, height };
	}

	return {
		schema: 1,
		name: identity.name,
		folder: identity.folder,
		bucket,
		pathPrefix,
		layout: identity.layout,
		status: "ready",
		createdAt,
		placeholder,
		source: manifestSource,
		variants,
	};
};
