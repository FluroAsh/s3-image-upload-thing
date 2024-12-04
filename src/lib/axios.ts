import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3002'
})

export default instance
