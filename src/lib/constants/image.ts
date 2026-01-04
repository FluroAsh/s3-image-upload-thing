import { ImageVariant } from "@/features/image/types";

export const DEFAULT_FILE_TYPE = "webp";

export const IMAGE_VARIANTS = [
  "placeholder",
  "small",
  "medium",
  "large",
  "lossless",
] as ImageVariant[];

export const IMAGE_WIDTH = {
  placeholder: 20,
  small: 400,
  medium: 800,
  large: 1440,
  lossless: null, // Original dimensions, no resize
} as const;

export const IMAGE_QUALITY = {
  placeholder: 60, // Lower quality for tiny blur placeholder
  small: 80, // Good quality for mobile
  medium: 85, // Balanced quality/size
  large: 90, // High quality for desktop
  lossless: 100, // Maximum quality, near-lossless compression
} as const;

export const PHOTO_FORMATS = ["NEF"];

export const CAMERA_DIMENSIONS = {
  ["NIKON Z 50"]: { width: 5568, height: 3712 },
  // Other cameras... 🥸
} as { [key: string]: { width: number; height: number } };
