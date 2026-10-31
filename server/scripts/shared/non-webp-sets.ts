import { EXTENSION, groupImageSets, type ImageSet, type SetIdentity } from "@/modules/storage/services/manifest";
import type { Manifest } from "~/shared/types";

/** Image formats that are not WebP, so the classifier skips them and they get no manifest; the report lists them to make that visible. */
export const NON_WEBP_EXTENSIONS = ["jpg", "jpeg", "png"] as const;

export type NonWebpSet = SetIdentity & {
	/** The skipped non-webp keys, each with the variant name it would hold if its extension were read. */
	members: ImageSet["members"];
	/** Webp keys that share the set's name; empty when the set is non-webp throughout. */
	webpSiblings: (ImageSet["members"][number] & {
		/** Set name and variant the classifier really gives the key, which cannot see its non-webp siblings. */
		classifiedAs: Pick<Manifest, "name"> & Pick<ImageSet["members"][number], "variant">;
	})[];
};

const NON_WEBP_KEY = new RegExp(`\\.(${NON_WEBP_EXTENSIONS.join("|")})$`, "i");

/** Sets found by reading `NON_WEBP_EXTENSIONS` as if they were webp, that hold at least one such key. */
export const findNonWebpSets = (keys: readonly string[], sets: readonly ImageSet[]): NonWebpSet[] => {
	// Grouping each image under a webp name applies the classifier's own rules to formats it does not read.
	const keysByWebpName = new Map<string, string[]>();
	for (const key of keys) {
		if (!key.endsWith(EXTENSION) && !NON_WEBP_KEY.test(key)) continue;
		const webpName = key.replace(NON_WEBP_KEY, EXTENSION);
		keysByWebpName.set(webpName, [...(keysByWebpName.get(webpName) ?? []), key]);
	}

	const classifiedByKey = new Map(
		sets.flatMap(({ name, members }) => members.map(({ key, variant }) => [key, { name, variant }] as const)),
	);

	return groupImageSets(Array.from(keysByWebpName.keys())).sets.flatMap(
		({ members: webpNamedMembers, ...identity }) => {
			const allMembers = webpNamedMembers.flatMap(({ key: webpName, variant }) =>
				(keysByWebpName.get(webpName) ?? []).map((key) => ({ key, variant })),
			);
			const members = allMembers.filter(({ key }) => !key.endsWith(EXTENSION));
			if (!members.length) return [];

			const webpSiblings = allMembers.flatMap((member) => {
				const classifiedAs = classifiedByKey.get(member.key);
				return classifiedAs ? [{ ...member, classifiedAs }] : [];
			});

			return [{ ...identity, members, webpSiblings }];
		},
	);
};
