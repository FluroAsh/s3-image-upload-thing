import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { runUploadPipeline } from "../services/upload-pipeline";

const badRequest = (message: string) => new HTTPException(400, { message });

const parseUploadRequest = async (ctx: Context) => {
	const body = await ctx.req.parseBody({ all: true });
	const { bucketName, bucketRegion, images, destination = "" } = body;

	if (!bucketName || typeof bucketName !== "string") throw badRequest("Bucket name is required");
	if (!bucketRegion || typeof bucketRegion !== "string") throw badRequest("Bucket region is required");

	if (!images) throw badRequest("No images provided");

	const imageArray = Array.isArray(images) ? images : [images];
	const fileEntries = Object.entries(imageArray);

	return {
		bucketName,
		bucketRegion,
		destination: destination as string,
		fileEntries,
	};
};

export const uploadImagesHandler = async (ctx: Context) => {
	try {
		const { bucketName, bucketRegion, destination, fileEntries } = await parseUploadRequest(ctx);

		if (fileEntries.length === 0) {
			throw badRequest("No files uploaded");
		}

		const uploadResults = await runUploadPipeline({
			fileEntries,
			bucketName,
			bucketRegion,
			destination,
		});

		return ctx.json({
			message: "Successfully uploaded images",
			files: uploadResults,
		});
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);

		console.error("Error in upload process:", error);

		const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during upload";

		return ctx.json({ error: errorMessage }, 500);
	}
};
