// import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
// import * as z from 'zod'
import { Hono } from 'hono'

const root = new Hono()

root.get('/', async (c) => {
  return c.json({ message: 'Hello, World!' })
})

export default root
