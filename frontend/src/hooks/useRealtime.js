import { useContext, useEffect } from 'react'
import { RealtimeContext } from '@/realtime/realtime-context'

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

export function useRealtimeEvent(event, handler) {
  const { subscribe } = useRealtime()

  useEffect(() => {
    if (!event || !handler) return undefined
    return subscribe(event, handler)
  }, [event, handler, subscribe])
}
