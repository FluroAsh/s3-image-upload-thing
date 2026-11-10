import type { Context } from "hono";

import type { FileTreeResponse } from "~/shared/types";

import { constructFileTree } from "../services/file-tree";
import { listObjects } from "../services/s3-operations";
import { bucketLocationOf } from "./params";
import { respond } from "./respond";

export const getBucketHandler = (ctx: Context) =>
	respond<FileTreeResponse>(ctx, async () => {
		const { objects, partial } = await listObjects(bucketLocationOf(ctx));
		return { tree: constructFileTree({ objects }), partial };
	});
