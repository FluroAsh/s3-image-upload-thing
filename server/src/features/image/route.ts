import withS3Client, { type WithS3Client } from "@/middleware/with-s3-client";
import { uploadImagesHandler } from "./controller";
import { Hono } from "hono";

const image = new Hono<WithS3Client>();

image.use("*", withS3Client);
image.post("/upload", uploadImagesHandler);

export default image;
