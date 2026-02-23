const DEPTH_INDENT_PX = 24;
const DEPTH_BASE_OFFSET_PX = 8;

export const getDepthPadding = (depth: number) => `${depth * DEPTH_INDENT_PX + DEPTH_BASE_OFFSET_PX}px`;

// Extracts the string between "_" and "." (ie: "large_filename.jpg" -> "filename")
export const extractFilename = (value: string) => value.match(/_(.+)\./)?.[1];

export const getVariantType = (fileName: string) => {
	const variant = fileName.split("_")[0];
	return variant ? `${variant[0].toUpperCase()}${variant.slice(1)}` : "";
};

// export const replaceFileSegment = (filename: string, value: string) =>
//   filename.replace(/[^/]+$/, value);
