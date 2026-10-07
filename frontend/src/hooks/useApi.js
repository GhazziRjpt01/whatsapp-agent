import { useCallback, useState } from 'react'
import api from '@/services/api'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const request = useCallback(async (config) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api(config)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Request failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { request, loading, error }
}
