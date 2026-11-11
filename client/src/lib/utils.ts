import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { FONT_SIZES } from "./font-sizes";

const twMerge = extendTailwindMerge({
	extend: { classGroups: { "font-size": [{ text: Object.keys(FONT_SIZES) }] } },
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
