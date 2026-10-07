import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '@/services/api'

export function useAsync(asyncFn, deps = [], options = {}) {
  const { immediate = true } = options
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(Boolean(immediate))
  const requestId = useRef(0)
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  const execute = useCallback(async (...args) => {
    const current = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const result = await fnRef.current(...args)
      if (current !== requestId.current) return null

      if (result && typeof result === 'object' && 'data' in result) {
        setData(result.data)
        setMeta(result.meta || null)
        return result
      }

      setData(result)
      setMeta(null)
      return result
    } catch (err) {
      if (current !== requestId.current) return null
      const message = getErrorMessage(err)
      setError(message)
      throw err
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!immediate) return undefined
    execute().catch(() => {})
    return undefined
    // Re-run when caller-provided deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate, ...deps])

  return {
    data,
    meta,
    error,
    loading,
    setData,
    setMeta,
    setError,
    reload: execute,
    execute,
  }
}
