// import { swaggerUI } from '@hono/swagger-ui'
// import { OpenAPIHono } from '@hono/zod-openapi'

import { Hono } from "hono";
import { cors } from "hono/cors";
import storage from "./modules/storage/routes";

const port = process.env.PORT || 3002;

const app = new Hono();

app.use("*", cors());

// Health check endpoint (infrastructure/monitoring - not a feature)
app.get("/health", (c) =>
  c.json(
    {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    },
    200
  )
);

app.route("/storage", storage);

// app.doc("/doc", {
//   openapi: "3.0.0",
//   info: {
//     title: "Hono API",
//     version: "1.0.0",
//   },
// });

// app.get("/ui", swaggerUI({ url: "doc" }));

console.log(`Server started on port ${port}`);

export default {
  port,
  fetch: app.fetch,
  // maxRequestBodySize: maxSize,
};
