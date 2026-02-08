import { ListObjectsCommand } from "@aws-sdk/client-s3";
import { Context } from "hono";

import { WithS3Client } from "@/shared/middleware/with-s3-client";

import { constructFileTree } from "../services/file-tree";

export const getBucketHandler = async (ctx: Context<WithS3Client>) => {
  const { s3Instance } = ctx.var;
  const bucketName = ctx.req.param("bucketName");

  try {
    const listResponse = await s3Instance.send(
      new ListObjectsCommand({ Bucket: bucketName }),
    );

    const fileTree = constructFileTree({
      objects: listResponse.Contents ?? [],
    });

    if (!fileTree.length) {
      return ctx.json({ message: "No objects found" }, 404);
    }

    return ctx.json({ tree: fileTree });
  } catch (e) {
    console.error(e);
    return ctx.json(
      { error: e instanceof Error ? e.message : "Failed to get bucket" },
      500,
    );
  }
};
