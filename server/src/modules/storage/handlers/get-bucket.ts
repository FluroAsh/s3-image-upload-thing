import type { Context } from "hono";

import { bucketLocationOf } from "@/shared/utils/params";
import { respond } from "@/shared/utils/respond";
import type { FileTreeResponse } from "~/shared/types";

import { constructFileTree } from "../services/file-tree";
import { listObjects } from "../services/s3-operations";

export const getBucketHandler = (ctx: Context) =>
	respond<FileTreeResponse>(ctx, async () => {
		const { objects, partial } = await listObjects(bucketLocationOf(ctx));
		return { tree: constructFileTree({ objects }), partial };
	});
