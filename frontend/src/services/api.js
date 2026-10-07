import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = getErrorMessage(error)

    if (status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth_user')
      if (!window.location.pathname.startsWith('/login')) {
        toast.error('Session expired. Please sign in again.')
        window.location.assign('/login')
      }
    }

    error.friendlyMessage = message
    return Promise.reject(error)
  },
)

export function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.friendlyMessage ||
    error?.message ||
    'Something went wrong'
  )
}

export function unwrap(response) {
  return {
    data: response.data?.data ?? null,
    meta: response.data?.meta ?? null,
    message: response.data?.message ?? 'Success',
    success: Boolean(response.data?.success),
  }
}

export default api
