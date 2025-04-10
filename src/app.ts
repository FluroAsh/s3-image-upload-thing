// import { swaggerUI } from '@hono/swagger-ui'
// import { OpenAPIHono } from '@hono/zod-openapi'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import s3 from './features/s3/route'
import image from './features/image/route'

const app = new Hono()

app.use('*', cors())

app.route('/s3', s3)
app.route('/image', image)

// app.doc("/doc", {
//   openapi: "3.0.0",
//   info: {
//     title: "Hono API",
//     version: "1.0.0",
//   },
// });

// app.get("/ui", swaggerUI({ url: "doc" }));

console.log('Server started on port 3002')

export default {
  port: process.env.PORT || 3002,
  fetch: app.fetch
}
