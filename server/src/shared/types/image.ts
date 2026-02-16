import type { ImageVariant } from "@shared/types";

export type { ImageVariant };

export type ProcessedImage = {
	fieldName: string;
	buffer: ArrayBuffer | Buffer;
	fileName: string;
	fileType: string;
	size: string;
};

export type ImageVariants = {
	fieldName: string;
	fileName: string;
	fileType: string;
	size: string;
	source: ProcessedImage;
	variations: Record<
		ImageVariant,
		{
			buffer: Buffer;
			size: string;
		}
	>;
};
