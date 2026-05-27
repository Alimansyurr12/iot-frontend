import axios from 'axios'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://iot-backend-production-3a02.up.railway.app/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default api