import * as child_process from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Process image with ImageMagick for better color reproduction
 */
export const enhanceImageColors = async (
  buffer: Buffer,
  options: {
    profile?: string; // Optional ICC profile path
    saturation?: number; // Saturation adjustment (1.0 = no change)
    vibrance?: number; // Vibrance adjustment (higher = more vibrant colors)
    colorSpace?: string; // Target colorspace (sRGB, Adobe RGB, etc.)
    bitDepth?: number; // Output bit depth (8, 16)
  },
): Promise<Buffer> => {
  const {
    profile = "",
    saturation = 1.0,
    vibrance = 1.0,
    colorSpace = "sRGB",
    bitDepth = 8,
  } = options;

  // Create temp directory for processing
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "imagemagick-"));
  const inputPath = path.join(tempDir, "input.tiff");
  const outputPath = path.join(tempDir, "output.tiff");

  try {
    // Write buffer to temp file
    fs.writeFileSync(inputPath, buffer as any);

    // Build ImageMagick command
    const args = [
      inputPath,
      "-colorspace",
      colorSpace,
      "-depth",
      bitDepth.toString(),
    ];

    // Add profile if specified
    if (profile && fs.existsSync(profile)) {
      args.push("-profile", profile);
    }

    // Add color adjustments
    if (saturation !== 1.0) {
      args.push("-modulate", `100,${saturation * 100},100`);
    }

    // Add vibrance (Magick specific)
    if (vibrance !== 1.0) {
      args.push(
        "-channel",
        "RGB",
        "-evaluate",
        "multiply",
        vibrance.toString(),
        "+channel",
      );
    }

    // Output
    args.push(outputPath);

    // Run convert
    const convertProcess = child_process.spawnSync("convert", args, {
      encoding: "utf8",
    });

    if (convertProcess.status !== 0) {
      console.error(`ImageMagick error: ${convertProcess.stderr}`);
      throw new Error(
        `ImageMagick processing failed: ${convertProcess.stderr}`,
      );
    }

    // Read and return the processed file
    const processedBuffer = fs.readFileSync(outputPath);
    console.log("Successfully enhanced image colors with ImageMagick");

    return processedBuffer;
  } catch (error) {
    console.error("Error processing with ImageMagick:", error);
    throw error;
  } finally {
    // Clean up
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      fs.rmdirSync(tempDir);
    } catch (e) {
      console.warn("Failed to clean up temp files:", e);
    }
  }
};

/**
 * Check if ImageMagick is available on the system
 */
export const isImageMagickAvailable = (): boolean => {
  try {
    const result = child_process.spawnSync("convert", ["-version"], {
      encoding: "utf8",
    });
    return result.status === 0;
  } catch (error) {
    return false;
  }
};
