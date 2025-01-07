import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3002',
  headers: {
    'x-amz-bucket-region': process.env.NEXT_PUBLIC_S3_REGION || 'ap-southeast-2'
  }
})

export default axiosInstance
