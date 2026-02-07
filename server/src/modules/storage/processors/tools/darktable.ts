import { readableSize } from "@/shared/utils/helpers";
import * as child_process from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

type DarktableImageFormat = "tif" | "png" | "jpeg";
type Options = { format: DarktableImageFormat };

/** This will return the ACTUAL raw image buffer, not the embedded JPEG preview. */
export const processNefWithDarktable = async (
  buffer: Buffer,
  options: Options = { format: "tif" }
) => {
  const { format = "tif" } = options;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "darktable-")); // Create temp directory for processing
  const inputPath = path.join(tempDir, "input.nef");
  const outputPath = path.join(tempDir, `output.${format}`);

  try {
    fs.writeFileSync(inputPath, buffer as any);
    console.log(
      `||== Processing RAW image with darktable-cli to format "${format.toUpperCase()}" ==||`
    );

    const args = [
      inputPath,
      outputPath,
      "--icc-type",
      "SRGB",
      "--out-ext",
      format,
    ];
    const dtProcess = child_process.spawnSync("darktable-cli", args, {
      encoding: "utf8",
    });

    console.log("Executing darktable-cli:", args.join(" "));
    console.log("Darktable stdout:", dtProcess.stdout);

    if (dtProcess.status !== 0) {
      console.error(
        `darktable-cli error || [code ${dtProcess.status}]: ${
          dtProcess.stderr || "No stderr output"
        }`
      );
      throw new Error(
        `Failed to process NEF with darktable-cli [exit code: ${dtProcess.status}]`
      );
    }

    // Fallback when darktable-cli output format is different to passed format option
    if (!fs.existsSync(outputPath)) {
      return locateOutputFile(tempDir, outputPath);
    }

    return fs.readFileSync(outputPath);
  } catch (error) {
    console.error("Darktable processing error:", error);
    throw error;
  } finally {
    cleanupFiles(inputPath, outputPath, tempDir);
  }
};

function cleanupFiles(inputPath: string, outputPath: string, tempDir: string) {
  try {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    const files = fs.readdirSync(tempDir);
    files.forEach((file) => {
      if (file.startsWith("output")) {
        fs.unlinkSync(path.join(tempDir, file));
      }
    });

    fs.rmdirSync(tempDir);
  } catch (e) {
    console.warn("Failed to clean up temp files:", e);
  }
}

function locateOutputFile(tempDir: string, expectedOutputPath: string) {
  console.log(
    `Expected output file not found at "${expectedOutputPath}", checking for alternatives...`
  );

  const files = fs.readdirSync(tempDir);
  console.log("Files in temp directory:", files);

  const outputFile = files.find(
    (file) => file !== "input.nef" && file.startsWith("output")
  );

  if (outputFile) {
    const actualOutputPath = path.join(tempDir, outputFile);
    console.log(`🔎 Found output file at ${actualOutputPath}`);

    // Read the found file
    const processedBuffer = fs.readFileSync(actualOutputPath);
    console.log(
      `✅ Successfully processed NEF (${readableSize(processedBuffer.length)})`
    );
    return processedBuffer;
  } else {
    throw new Error("No output file created by darktable-cli");
  }
}
