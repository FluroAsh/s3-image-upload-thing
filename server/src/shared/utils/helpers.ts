import fileSize from "file-size";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { ImageVariants } from "@/shared/types/image";

export const getFileType = (fileName: string) => path.parse(fileName).ext;

export const readableSize = (size: number, spec?: "si" | "iec" | "jedec") =>
  fileSize(size).human(spec ?? "si");

/** ---- Test utils ----- */
export const getDesktopPath = (): string => {
  return path.join(os.homedir(), "Desktop");
};

/** Simple utility for writing files to the desktop instead of S3. */
export const writeToDesktop = (image: ImageVariants) => {
  const desktopPath = getDesktopPath();
  const baseFolderPath = path.join(
    desktopPath,
    "image-uploads",
    path.parse(image.fileName).name,
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(baseFolderPath)) {
    fs.mkdirSync(baseFolderPath, { recursive: true });
  }

  // Write source image
  if (image.source && image.source.buffer) {
    const sourcePath = path.join(baseFolderPath, `source-${image.fileName}`);
    fs.writeFileSync(sourcePath, new Uint8Array(image.source.buffer));
    console.log(`Source image written to: ${sourcePath}`);
  }

  // Write each variant
  Object.entries(image.variations).forEach(([variant, { buffer }]) => {
    const variantPath = path.join(
      baseFolderPath,
      `${variant}-${path.parse(image.fileName).name}.webp`,
    );
    fs.writeFileSync(variantPath, new Uint8Array(buffer));
    console.log(`${variant} variant written to: ${variantPath}`);
  });

  return { baseFolderPath };
};
