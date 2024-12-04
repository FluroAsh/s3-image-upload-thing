import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import * as z from "zod";

const root = new OpenAPIHono();

const rootRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: 'Returns the message "Hello Hono!"',
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
  tags: ["Root Route"],
  summary: "The root route which returns a message",
});

root.openapi(rootRoute, (c) => {
  return c.json({ message: "Hello Hono!" });
});

export default root;
