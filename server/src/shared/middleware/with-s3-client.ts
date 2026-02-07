import { S3Client } from "@aws-sdk/client-s3";
import { createMiddleware } from "hono/factory";

import { createInstance } from "@/modules/storage/services/s3-operations";

export type WithS3Client = {
  Variables: {
    s3Instance: S3Client;
    region: string;
  };
};

export const withS3ClientMiddlware = createMiddleware<WithS3Client>(
  async (ctx, next) => {
    const region = ctx.req.header("x-amz-bucket-region");

    if (!region) {
      return ctx.json({ error: "Missing region header" }, 400);
    }

    const s3Instance = createInstance(region);
    ctx.set("s3Instance", s3Instance);
    ctx.set("region", region);
    await next();
  },
);
