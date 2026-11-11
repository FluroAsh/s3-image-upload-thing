import { IMAGE_VARIANTS, planVariants, VARIANT_LONGEST_EDGE } from "~/shared/constants/image-variants";

export type PickedFile = {
	/** Stable key for the row; file names can repeat within a selection. */
	id: string;
	file: File;
	/** Pixel width; `undefined` when the browser cannot decode the file, e.g. HEIC. */
	width?: number;
	/** Pixel height; `undefined` when the browser cannot decode the file. */
	height?: number;
};

/** A source whose longest edge is below this loses at least one size to the no-upscale rule. */
export const SMALL_SOURCE_PX = VARIANT_LONGEST_EDGE.medium;

/** The name of the set the server stores a file as: the file name without its last extension. */
export const setNameOf = (fileName: string) => fileName.replace(/\.[^.]+$/, "");

export const pickFile = async (file: File): Promise<PickedFile> => {
	const picked = { id: crypto.randomUUID(), file };
	try {
		const bitmap = await createImageBitmap(file);
		const { width, height } = bitmap;
		bitmap.close();
		return { ...picked, width, height };
	} catch {
		return picked;
	}
};

/** Amber notes shown before upload; the server's per-file result stays the source of truth. */
export const uploadWarnings = ({ file, width, height }: PickedFile, existingSets: ReadonlySet<string>): string[] => {
	const warnings: string[] = [];
	const longestEdge = width && height ? Math.max(width, height) : undefined;

	if (longestEdge !== undefined && longestEdge < SMALL_SOURCE_PX) {
		const stored = planVariants(longestEdge);
		warnings.push(`source ${longestEdge}px · ${IMAGE_VARIANTS.filter((v) => !stored.includes(v)).join(", ")} skipped`);
	}

	const name = setNameOf(file.name);
	if (existingSets.has(name)) warnings.push(`a set named ${name} exists here`);

	return warnings;
};
