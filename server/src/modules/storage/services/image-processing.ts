import type { ProcessedImage } from "@/shared/types/image";
import { readableSize } from "@/shared/utils/helpers";

import { createImageVariants as createVariants } from "../processors/variants/processor";

/**
 * Prepares uploaded files for processing by converting them to ProcessedImage format
 * @param files - Array of tuples containing field name and file
 * @returns Promise resolving to array of ProcessedImage objects
 */
export const prepareImages = async (files: [string, string | File][]): Promise<ProcessedImage[]> => {
	const processedImages = await Promise.all(
		files.map(async ([fieldName, file]): Promise<ProcessedImage | null> => {
			if (!(file instanceof File)) {
				return null;
			}

			return {
				fieldName,
				buffer: await file.arrayBuffer(),
				fileName: file.name,
				fileType: file.type,
				size: readableSize(file.size),
			};
		}),
	);

	return processedImages.filter((image): image is ProcessedImage => image !== null);
};

/** Re-export so callers (e.g. upload-pipeline) use the variant processor via the service layer. */
export { createImageVariants } from "../processors/variants/processor";
