// import { swaggerUI } from '@hono/swagger-ui'
// import { OpenAPIHono } from '@hono/zod-openapi'

import rootRoute from './routes/root'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono().basePath('/api')

app.use('*', cors())

app.route('/', rootRoute)

// app.doc("/doc", {
//   openapi: "3.0.0",
//   info: {
//     title: "Hono API",
//     version: "1.0.0",
//   },
// });

// app.get("/ui", swaggerUI({ url: "doc" }));

export default {
  port: process.env.PORT || 3002,
  fetch: app.fetch
}
