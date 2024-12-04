// import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
// import * as z from 'zod'
import { Hono } from 'hono'
import {} from 'bcrypt'
import { decode } from 'jsonwebtoken'

const root = new Hono()

root.get('/', async (c) => {
  return c.json({ message: 'Hello, World!' })
})

// this logic should be inside a service/model
root.post('/decode', async (c) => {
  const { body } = await c.req.json()
  const { token } = body
  // console.log({ token })
  // console.log(c.req)

  console.log(token)
  if (!token) {
    return c.json({ message: 'Token is required' }, 400)
  }

  try {
    const decoded = decode(token)

    // TODO: Take the decoded token to provision AWS temporary credentials
    // return the credentials to the client so they can access and manage AWS resources
    return c.json({ decoded })
  } catch (error) {
    return c.json({ message: 'Invalid token' }, 400)
  }
})

export default root
