import { ofetch } from 'ofetch'

const ofetchInstance = ofetch.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  headers: {
    'x-amz-bucket-region': process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2'
  }
})

export default ofetchInstance
