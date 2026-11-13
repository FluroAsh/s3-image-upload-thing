import { Hono } from "hono";

import {
	addHookHandler,
	deleteHookHandler,
	deployHandler,
	listHooksHandler,
	testHookHandler,
	updateHookHandler,
} from "./handlers/hooks";
import { setPinnedBucketHandler } from "./handlers/pinned-bucket";

const settings = new Hono();

settings.get("/hooks", listHooksHandler);
settings.post("/hooks", addHookHandler);
/** Registered before `:id` routes, which would otherwise read "deploy" as an id. */
settings.post("/hooks/deploy", deployHandler);
settings.patch("/hooks/:id", updateHookHandler);
settings.delete("/hooks/:id", deleteHookHandler);
settings.post("/hooks/:id/test", testHookHandler);

settings.put("/pinned-bucket", setPinnedBucketHandler);

export default settings;
