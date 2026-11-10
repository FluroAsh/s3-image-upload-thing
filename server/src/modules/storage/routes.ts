import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import {
	createCollectionHandler,
	deleteCollectionHandler,
	listCollectionsHandler,
	reorderCollectionHandler,
	setMembersHandler,
	updateCollectionHandler,
	updatePhotoHandler,
} from "./handlers/collections";
import { generateSizesHandler } from "./handlers/generate-sizes";
import { getBucketHandler } from "./handlers/get-bucket";
import { getManifestHandler } from "./handlers/get-manifest";
import { listBucketsHandler } from "./handlers/list-buckets";
import { presignedUrlsHandler } from "./handlers/presigned-urls";
import { uploadImagesHandler } from "./handlers/upload";

const storage = new Hono();

const maxSize = Number.MAX_SAFE_INTEGER; // Virtually unlimited size (DO NOT use this in Prod)

storage.use(
	bodyLimit({
		maxSize,
		onError: (ctx) => ctx.json({ error: "Request body too large" }, 413),
	}),
);

storage.post("/upload", uploadImagesHandler);

storage.get("/buckets", listBucketsHandler);
storage.get("/buckets/:bucketName", getBucketHandler);
storage.post("/presigned-urls", presignedUrlsHandler);

/** A set path holds slashes, so the param takes the rest of the path. */
storage.get("/manifests/:set{.+}", getManifestHandler);

storage.post("/sizes/:set{.+}", generateSizesHandler);

storage.get("/collections", listCollectionsHandler);
storage.post("/collections", createCollectionHandler);
storage.put("/collections/members", setMembersHandler);
/** A set path holds slashes, so the param takes the rest of the path. */
storage.patch("/collections/members/:set{.+}", updatePhotoHandler);
/** `:slug` takes one segment, so it never captures the `members` routes above. */
storage.patch("/collections/:slug", updateCollectionHandler);
storage.delete("/collections/:slug", deleteCollectionHandler);
storage.put("/collections/:slug/order", reorderCollectionHandler);

storage.post("/bucket/:bucketName", async (_ctx) => {});

storage.put("/bucket/:bucketName", async (_ctx) => {});

storage.delete("/bucket/:bucketName", async (_ctx) => {});
storage.get("/bucket/:bucketName/object/:name", async (ctx) => {
	const bucketName = ctx.req.param("bucketName");
	const objectKey = ctx.req.param("name");

	console.log(`Getting object: ${objectKey} from bucket: ${bucketName}`);

	return ctx.json({ url: "https://via.placeholder.com/150" });
});

storage.delete("/bucket/:bucketName/object/:name", async (_ctx) => {});

storage.put("/bucket/:bucketName/object/:name", async (_ctx) => {});

export default storage;
