import { Hono } from "hono";

import {
	createCollectionHandler,
	listCollectionsHandler,
	setMembersHandler,
	updatePhotoHandler,
} from "./handlers/collections";

const collections = new Hono();

collections.get("/", listCollectionsHandler);
collections.post("/", createCollectionHandler);
collections.put("/members", setMembersHandler);
// A set path holds slashes, so the param takes the rest of the path.
collections.patch("/members/:set{.+}", updatePhotoHandler);

export default collections;
