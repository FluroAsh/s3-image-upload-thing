// import { swaggerUI } from '@hono/swagger-ui'
// import { OpenAPIHono } from '@hono/zod-openapi'

import rootRoute from './routes/root'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import s3 from './routes/s3'

const app = new Hono()

app.use('*', cors())

app.route('/', rootRoute)
app.route('/s3', s3)

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
