import { ofetch } from 'ofetch'

// Relative URLs - browser will infer origin, Next.js rewrites will proxy /api/* to backend
const ofetchInstance = ofetch.create({
  headers: {
    'x-amz-bucket-region': process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2'
  }
})

export default ofetchInstance
