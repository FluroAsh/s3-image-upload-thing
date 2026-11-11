import { LucideImage, LucideImages, LucideListVideo, LucideVideo } from "lucide-react";

/** Builds a checker that matches a file name against the extensions, ignoring case. */
const endsWithExt =
	(extensions: string[]) =>
	(name: string | null): boolean => {
		if (!name) return false;

		const lowerName = name.toLowerCase();
		return extensions.some((ext) => lowerName.endsWith(ext));
	};

export const isImageFile = endsWithExt([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]);

export const isVideoFile = endsWithExt([".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v"]);

export const getFileIcon = (name: string | null, multiple?: boolean) => {
	switch (true) {
		case isVideoFile(name):
			return multiple ? LucideListVideo : LucideVideo;
		case isImageFile(name):
			return multiple ? LucideImages : LucideImage;
		default:
			return undefined;
	}
};
