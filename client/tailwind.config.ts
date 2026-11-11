import type { Config } from "tailwindcss";
import { FONT_SIZES } from "./src/lib/font-sizes";
import { fontFamily } from "tailwindcss/defaultTheme";

/** Colours are stored as `r g b` channels so opacity modifiers like `bg-accent/12` work. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-geist-sans)", ...fontFamily.sans],
				mono: ["var(--font-geist-mono)", ...fontFamily.mono],
			},
			colors: {
				canvas: token("bg-0"),
				panel: token("bg-1"),
				raised: token("bg-2"),
				pressed: token("bg-3"),
				line: { DEFAULT: token("line"), strong: token("line-strong") },
				fg: { DEFAULT: token("fg-0"), 1: token("fg-1"), 2: token("fg-2") },
				accent: token("accent"),
				ok: token("ok"),
				warn: token("warn"),
				err: token("err"),
			},
			fontSize: FONT_SIZES,
			spacing: {
				row: "28px",
				control: "26px",
				chip: "18px",
				topbar: "36px",
			},
			opacity: {
				12: "0.12",
				45: "0.45",
			},
			borderRadius: {
				sm: "3px",
				md: "5px",
				lg: "8px",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
