import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { uploadSetIdentity } from "../services/manifest";
import { runUploadPipeline } from "../services/upload-pipeline";

const badRequest = (message: string) => new HTTPException(400, { message });

/** Trims and collapses slashes so `trip/` and `trip` store under the same keys; dot segments could climb out of the folder. */
const normaliseDestination = (destination: string): string => {
	const segments = destination.split("/").filter(Boolean);
	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw badRequest('Destination cannot contain "." or ".." segments');
	}
	return segments.join("/");
};

const parseUploadRequest = async (ctx: Context) => {
	const body = await ctx.req.parseBody({ all: true });
	const { bucketName, bucketRegion, images, destination: rawDestination = "" } = body;

	if (!bucketName || typeof bucketName !== "string") throw badRequest("Bucket name is required");
	if (!bucketRegion || typeof bucketRegion !== "string") throw badRequest("Bucket region is required");

	if (typeof rawDestination !== "string") throw badRequest("Destination must be a single folder path");
	const destination = normaliseDestination(rawDestination);

	if (!images) throw badRequest("No images provided");

	const imageArray = Array.isArray(images) ? images : [images];
	const fileEntries = Object.entries(imageArray);

	const names = imageArray.flatMap((image) =>
		image instanceof File ? [uploadSetIdentity(destination, image.name).name] : [],
	);
	if (new Set(names).size < names.length) throw badRequest("Two files in one upload cannot share a name");

	return {
		bucketName,
		bucketRegion,
		destination,
		fileEntries,
	};
};

export const uploadImagesHandler = async (ctx: Context) => {
	try {
		const { bucketName, bucketRegion, destination, fileEntries } = await parseUploadRequest(ctx);

		if (fileEntries.length === 0) {
			throw badRequest("No files uploaded");
		}

		const outcome = await runUploadPipeline({ fileEntries, bucketName, bucketRegion, destination });

		if ("refused" in outcome) {
			if (outcome.refused === "reserved") {
				throw badRequest(`Path ${outcome.names.map((name) => `"${name}"`).join(", ")} is reserved`);
			}
			throw new HTTPException(409, { message: `An image set already exists for: ${outcome.names.join(", ")}` });
		}

		return ctx.json({
			message: "Successfully uploaded images",
			files: outcome.files,
		});
	} catch (error) {
		if (error instanceof HTTPException) return ctx.json({ error: error.message }, error.status);

		console.error("Error in upload process:", error);

		const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during upload";

		return ctx.json({ error: errorMessage }, 500);
	}
};
