import { ListObjectsCommand } from "@aws-sdk/client-s3";
import { Context } from "hono";

import { constructFileTree } from "../services/file-tree";
import { getRegionalClient } from "../services/s3-operations";

export const getBucketHandler = async (ctx: Context) => {
  const bucketName = ctx.req.param("bucketName");
  const bucketRegion = ctx.req.query("region");

  if (!bucketRegion) {
    return ctx.json({ error: "Missing required 'region' query parameter" }, 400);
  }

  try {
    const listResponse = await getRegionalClient(bucketRegion).send(
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
