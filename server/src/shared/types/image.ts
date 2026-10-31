import type { ImageVariant } from "~/shared/types";

export type { ImageVariant };

export type ProcessedImage = {
	fieldName: string;
	buffer: ArrayBuffer | Buffer;
	fileName: string;
	fileType: string;
	size: string;
};

export type VariantOutput = {
	/** Encoded bytes of the variant, ready to store. */
	buffer: Buffer;
	/** Human-readable size of `buffer`, e.g. `"1.5 MB"`. */
	size: string;
	/** Pixel width of the encoded variant as displayed, measured from the output. */
	width: number;
	/** Pixel height of the encoded variant as displayed, measured from the output. */
	height: number;
};

export type ImageVariants = {
	/** Multipart field the file arrived under. */
	fieldName: string;
	/** File name as uploaded, with its extension. */
	fileName: string;
	/** MIME type the client sent for the upload. */
	fileType: string;
	/** Human-readable size of the uploaded file, e.g. `"1.5 MB"`. */
	size: string;
	/** The upload the variants were made from. */
	source: ProcessedImage;
	/** Only the variants that were produced; a size larger than the source on its longest edge is absent. */
	variations: Partial<Record<ImageVariant, VariantOutput>>;
};
