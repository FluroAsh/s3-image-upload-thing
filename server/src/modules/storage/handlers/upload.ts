import { Context } from "hono";

import { runUploadPipeline } from "../services/upload-pipeline";

/**
 * Validates and extracts request body parameters
 * @returns Parsed request body with validated parameters
 */
const parseUploadRequest = async (ctx: Context) => {
  const body = await ctx.req.parseBody({ all: true });
  const { bucketName, images, destination = "" } = body;

  if (!bucketName || typeof bucketName !== "string") {
    throw new Error("Bucket name is required");
  }

  if (!images) {
    throw new Error("No images provided");
  }

  // Transform images Buffer into the same format whether or not it's a single image, or multiple
  const imageArray = Array.isArray(images) ? images : [images];
  const fileEntries = Object.entries(imageArray);

  return {
    bucketName,
    destination: destination as string,
    fileEntries,
  };
};

export const uploadImagesHandler = async (ctx: Context) => {
  try {
    const { bucketName, destination, fileEntries } =
      await parseUploadRequest(ctx);

    if (fileEntries.length === 0) {
      return ctx.json({ error: "No files uploaded" }, 400);
    }

    const uploadResults = await runUploadPipeline({
      fileEntries,
      bucketName,
      destination,
    });

    return ctx.json({
      message: "Successfully uploaded images",
      files: uploadResults,
    });
  } catch (error) {
    console.error("Error in upload process:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during upload";

    return ctx.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      500,
    );
  }
};
