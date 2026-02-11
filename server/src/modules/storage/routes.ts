import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import {
  type WithS3Client,
  withS3ClientMiddlware,
} from "@/shared/middleware/with-s3-client";

import { getBucketHandler } from "./handlers/get-bucket";
import { listBucketsHandler } from "./handlers/list-buckets";
import { presignedUrlsHandler } from "./handlers/presigned-urls";
import { uploadImagesHandler } from "./handlers/upload";

const storage = new Hono<WithS3Client>();

const maxSize = Number.MAX_SAFE_INTEGER; // Virtually unlimited size (DO NOT use this in Prod)

storage.use("*", withS3ClientMiddlware);
storage.use(
  bodyLimit({
    maxSize,
    onError: (c) => c.json({ error: "Request body too large" }, 413),
  }),
);

storage.post("/upload", uploadImagesHandler);

storage.get("/buckets", listBucketsHandler);
storage.get("/buckets/:bucketName", getBucketHandler);
storage.post("/presigned-urls", presignedUrlsHandler);

// -------------------------------------//
// ---- Single "Bucket" Operations ---- //
// -------------------------------------//
// TODO: Complete bucket operations

storage.post("/bucket/:bucketName", async (c) => {
  // Upload object(s) to a bucket (upload image(s))
  // Upload into a bucket subdirectory if specified
});

storage.put("/bucket/:bucketName", async (c) => {
  // Update a bucket properties (e.g., name, region, etc.)
});

storage.delete("/bucket/:bucketName", async (c) => {
  // TODO: Delete a bucket
});

// -------------------------------------//
// ---- Single "Object" Operations ---- //
// -------------------------------------//
storage.get("/bucket/:bucketName/object/:name", async (ctx) => {
  // TODO: Get "type" of object (e.g., image, text, etc.)
  const { s3Instance, region } = ctx.var;
  const bucketName = ctx.req.param("bucketName");
  const objectKey = ctx.req.param("name");

  console.log(`Getting object: ${objectKey} from bucket: ${bucketName}`);

  // fetch the presigned URL via the AWS SDK
  // const url = await getImage(bucketName, objectKey)
  // return c.json({ url })

  return ctx.json({ url: "https://via.placeholder.com/150" });
});

storage.delete("/bucket/:bucketName/object/:name", async (c) => {
  // TODO: Delete an object from a bucket
});

storage.put("/bucket/:bucketName/object/:name", async (c) => {
  // TODO: Update an object in a bucket
  // (ie replace the object with a new one)
});

export default storage;
