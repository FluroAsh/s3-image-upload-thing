export type ImageVariant =
  | "placeholder"
  | "small"
  | "medium"
  | "large"
  | "lossless";

/** Highest fidelity first — used for display ordering in menus and selections. */
export const IMAGE_VARIANT_ORDER: ImageVariant[] = [
  "lossless",
  "large",
  "medium",
  "small",
  "placeholder",
];
