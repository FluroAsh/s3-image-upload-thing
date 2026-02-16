/** RAW photo formats (e.g. for future Darktable pipeline). */
export const PHOTO_FORMATS = ["NEF"];

export const CAMERA_DIMENSIONS = {
	["NIKON Z 50"]: { width: 5568, height: 3712 },
	// Other cameras... 🥸
} as { [key: string]: { width: number; height: number } };
