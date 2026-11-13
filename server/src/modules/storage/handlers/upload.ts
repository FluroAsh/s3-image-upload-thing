import type { Context } from "hono";

import { badRequest, respond } from "@/shared/utils/respond";
import { UPLOAD_FIELD } from "~/shared/constants/upload";

import { runUploadPipeline } from "../services/upload-pipeline";

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
	const bucketName = body[UPLOAD_FIELD.BucketName];
	const bucketRegion = body[UPLOAD_FIELD.BucketRegion];
	const images = body[UPLOAD_FIELD.Images];
	const rawDestination = body[UPLOAD_FIELD.Destination] ?? "";

	if (!bucketName || typeof bucketName !== "string") throw badRequest("Bucket name is required");
	if (!bucketRegion || typeof bucketRegion !== "string") throw badRequest("Bucket region is required");

	if (typeof rawDestination !== "string") throw badRequest("Destination must be a single folder path");
	const destination = normaliseDestination(rawDestination);

	if (!images) throw badRequest("No images provided");

	const imageArray = Array.isArray(images) ? images : [images];
	const fileEntries = Object.entries(imageArray);

	return {
		bucketName,
		bucketRegion,
		destination,
		fileEntries,
	};
};

export const uploadImagesHandler = (ctx: Context) =>
	respond(ctx, async () => {
		const { bucketName, bucketRegion, destination, fileEntries } = await parseUploadRequest(ctx);

		if (fileEntries.length === 0) {
			throw badRequest("No files uploaded");
		}

		return { results: await runUploadPipeline({ fileEntries, bucketName, bucketRegion, destination }) };
	});
