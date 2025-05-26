// import { swaggerUI } from '@hono/swagger-ui'
// import { OpenAPIHono } from '@hono/zod-openapi'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'

import s3 from './features/s3/route'
import image from './features/image/route'

const app = new Hono()
const maxSize = Number.MAX_SAFE_INTEGER // Virtually unlimited size (DO NOT use this in Prod)

app.use(
  '*',
  cors(),
  bodyLimit({
    maxSize,
    onError: (c) => c.json({ error: 'Request body too large' }, 413)
  })
)

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
  fetch: app.fetch,
  maxRequestBodySize: maxSize
}
