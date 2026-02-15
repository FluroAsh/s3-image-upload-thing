import { ListObjectsCommand } from "@aws-sdk/client-s3";
import { Context } from "hono";

import { constructFileTree } from "../services/file-tree";
import { s3Client } from "../services/s3-operations";

export const getBucketHandler = async (ctx: Context) => {
  const bucketName = ctx.req.param("bucketName");

  try {
    const listResponse = await s3Client.send(
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
