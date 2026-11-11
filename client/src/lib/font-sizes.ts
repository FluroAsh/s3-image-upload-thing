/** Shared by tailwind.config.ts and `cn` so tailwind-merge knows these are sizes, not colours. */
export const FONT_SIZES = {
	body: ["13px", "18px"],
	secondary: ["12px", "16px"],
	caption: ["11px", "14px"],
} satisfies Record<string, [string, string]>;
