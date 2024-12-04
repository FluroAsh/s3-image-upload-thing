import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

import rootRoute from "./routes/root";

const app = new OpenAPIHono();

app.route("/", rootRoute);

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Hono API",
    version: "1.0.0",
  },
});

app.get("/ui", swaggerUI({ url: "doc" }));

export default app;
