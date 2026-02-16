import { LucideImage, LucideImages, LucideListVideo, LucideVideo } from "lucide-react";

const getPathname = (remoteURL: string) => {
	try {
		const url = new URL(remoteURL);
		return url.pathname;
	} catch (e) {
		console.error(`Unable to parse URL: ${remoteURL}`, e);
	}
};

/**
 * Higher-order function that creates a file type checker
 * @param extensions - Array of file extensions to check against
 * @returns A function that checks if a URL matches any of the extensions
 */
const endsWithExt =
	(extensions: string[]) =>
	(remoteURL: string | null): boolean => {
		if (!remoteURL) return false;

		const pathname = getPathname(remoteURL);
		const lowerPathname = pathname?.toLowerCase() || "";

		return extensions.some((ext) => lowerPathname.endsWith(ext));
	};

export const isImageFile = endsWithExt([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]);

export const isVideoFile = endsWithExt([".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v"]);

export const getFileIcon = (remoteURL: string | null, multiple?: boolean) => {
	switch (true) {
		case isVideoFile(remoteURL):
			return multiple ? LucideListVideo : LucideVideo;
		case isImageFile(remoteURL):
			return multiple ? LucideImages : LucideImage;
		default:
			return undefined;
	}
};
