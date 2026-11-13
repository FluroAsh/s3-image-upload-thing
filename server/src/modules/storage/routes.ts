import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { markBucketChangedOnWrite } from "../settings/mark-bucket-changed";
import { attachOriginalHandler } from "./handlers/attach-original";
import { attentionHandler } from "./handlers/attention";
import {
	createCollectionHandler,
	deleteCollectionHandler,
	listCollectionsHandler,
	reorderCollectionHandler,
	setMembersHandler,
	updateCollectionHandler,
	updatePhotoHandler,
} from "./handlers/collections";
import { downloadHandler } from "./handlers/download";
import { generateSizesHandler } from "./handlers/generate-sizes";
import { getBucketHandler } from "./handlers/get-bucket";
import { getManifestHandler } from "./handlers/get-manifest";
import { listBucketsHandler } from "./handlers/list-buckets";
import { presignedUrlsHandler } from "./handlers/presigned-urls";
import { uploadImagesHandler } from "./handlers/upload";

const storage = new Hono();

/** Virtually unlimited size (DO NOT use this in Prod). */
const maxSize = Number.MAX_SAFE_INTEGER;

storage.use(
	bodyLimit({
		maxSize,
		onError: (ctx) => ctx.json({ error: "Request body too large" }, 413),
	}),
);

storage.use(markBucketChangedOnWrite);

storage.post("/upload", uploadImagesHandler);

storage.get("/buckets", listBucketsHandler);
storage.get("/buckets/:bucketName", getBucketHandler);
storage.get("/download", downloadHandler);
storage.post("/presigned-urls", presignedUrlsHandler);

/** A set path holds slashes, so the param takes the rest of the path. */
storage.get("/manifests/:set{.+}", getManifestHandler);

storage.get("/attention", attentionHandler);

storage.post("/sizes/:set{.+}", generateSizesHandler);
storage.post("/original/:set{.+}", attachOriginalHandler);

storage.get("/collections", listCollectionsHandler);
storage.post("/collections", createCollectionHandler);
storage.put("/collections/members", setMembersHandler);
/** A set path holds slashes, so the param takes the rest of the path. */
storage.patch("/collections/members/:set{.+}", updatePhotoHandler);
/** `:slug` takes one segment, so it never captures the `members` routes above. */
storage.patch("/collections/:slug", updateCollectionHandler);
storage.delete("/collections/:slug", deleteCollectionHandler);
storage.put("/collections/:slug/order", reorderCollectionHandler);

export default storage;
