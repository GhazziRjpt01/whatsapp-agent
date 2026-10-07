import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { REALTIME_EVENTS } from './events'
import { RealtimeContext } from './realtime-context'

const UNREAD_KEY = 'inbox_unread_map'
const MAX_NOTIFICATIONS = 30

function readUnreadMap() {
  try {
    return JSON.parse(localStorage.getItem(UNREAD_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeUnreadMap(map) {
  localStorage.setItem(UNREAD_KEY, JSON.stringify(map))
}

function createEmitter() {
  const listeners = new Map()

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
      return () => listeners.get(event)?.delete(handler)
    },
    emit(event, payload) {
      const handlers = listeners.get(event)
      if (!handlers) return
      handlers.forEach((handler) => {
        try {
          handler(payload)
        } catch (error) {
          console.error('[realtime] listener error', error)
        }
      })
    },
  }
}

export function RealtimeProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const emitterRef = useRef(createEmitter())
  const dataChannelRef = useRef(null)
  const signalChannelRef = useRef(null)
  const activeConversationRef = useRef(null)
  const typingTimersRef = useRef(new Map())

  const [connectionState, setConnectionState] = useState('idle')
  const [notifications, setNotifications] = useState([])
  const [unreadMap, setUnreadMap] = useState(() => readUnreadMap())
  const [typingMap, setTypingMap] = useState({})
  const [onlineAgents, setOnlineAgents] = useState([])
  const realtimeEnabled = isSupabaseConfigured()

  const pushNotification = useCallback((notification) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    }
    setNotifications((prev) => [item, ...prev].slice(0, MAX_NOTIFICATIONS))
    emitterRef.current.emit(REALTIME_EVENTS.NOTIFICATION, item)
    return item
  }, [])

  const markConversationRead = useCallback((conversationId) => {
    if (!conversationId) return
    setUnreadMap((prev) => {
      if (!prev[conversationId]) return prev
      const next = { ...prev }
      delete next[conversationId]
      writeUnreadMap(next)
      return next
    })
  }, [])

  const setActiveConversation = useCallback(
    (conversationId) => {
      activeConversationRef.current = conversationId
      if (conversationId) markConversationRead(conversationId)
    },
    [markConversationRead],
  )

  const bumpUnread = useCallback((conversationId) => {
    if (!conversationId) return
    if (activeConversationRef.current === conversationId) return
    setUnreadMap((prev) => {
      const next = {
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1,
      }
      writeUnreadMap(next)
      return next
    })
  }, [])

  const clearTyping = useCallback((conversationId, userId) => {
    setTypingMap((prev) => {
      const current = prev[conversationId] || []
      const nextList = current.filter((item) => item.userId !== userId)
      if (nextList.length === current.length) return prev
      if (nextList.length === 0) {
        const next = { ...prev }
        delete next[conversationId]
        return next
      }
      return { ...prev, [conversationId]: nextList }
    })
  }, [])

  const applyTyping = useCallback(
    (payload) => {
      const { conversationId, userId, userName, isTyping } = payload || {}
      if (!conversationId || !userId) return
      if (userId === user?.email) return

      if (!isTyping) {
        clearTyping(conversationId, userId)
        return
      }

      setTypingMap((prev) => {
        const current = prev[conversationId] || []
        const exists = current.some((item) => item.userId === userId)
        const nextList = exists
          ? current.map((item) =>
              item.userId === userId
                ? { ...item, userName, at: Date.now() }
                : item,
            )
          : [...current, { userId, userName, at: Date.now() }]
        return { ...prev, [conversationId]: nextList }
      })

      const key = `${conversationId}:${userId}`
      if (typingTimersRef.current.has(key)) {
        clearTimeout(typingTimersRef.current.get(key))
      }
      typingTimersRef.current.set(
        key,
        setTimeout(() => clearTyping(conversationId, userId), 3500),
      )
    },
    [clearTyping, user?.email],
  )

  const broadcastTyping = useCallback(
    (conversationId, isTyping) => {
      if (!realtimeEnabled || !signalChannelRef.current || !user || !conversationId) {
        return
      }

      signalChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversationId,
          userId: user.email,
          userName: user.name,
          isTyping: Boolean(isTyping),
        },
      })
    },
    [realtimeEnabled, user],
  )

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionState('idle')
      return undefined
    }

    if (!realtimeEnabled || !supabase) {
      setConnectionState('disabled')
      return undefined
    }

    let cancelled = false
    const emitter = emitterRef.current

    async function start() {
      setConnectionState('connecting')

      const { data } = await supabase.auth.getSession()
      if (data?.session?.access_token) {
        await supabase.realtime.setAuth(data.session.access_token)
      }

      if (cancelled) return

      const dataChannel = supabase
        .channel('inbox-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const row = payload.new
            emitter.emit(REALTIME_EVENTS.MESSAGE_INSERT, row)

            if (row?.sender_type === 'customer' || row?.sender_type === 'ai') {
              bumpUnread(row.conversation_id)
              const note = pushNotification({
                type: 'message',
                title:
                  row.sender_type === 'ai'
                    ? 'AI sent a reply'
                    : 'New customer message',
                body: row.message,
                conversationId: row.conversation_id,
              })
              if (activeConversationRef.current !== row.conversation_id) {
                toast.message(note.title, {
                  description: String(row.message || '').slice(0, 90),
                })
              }
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            emitter.emit(REALTIME_EVENTS.MESSAGE_UPDATE, payload.new)
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversations' },
          (payload) => {
            emitter.emit(REALTIME_EVENTS.CONVERSATION_INSERT, payload.new)
            pushNotification({
              type: 'conversation',
              title: 'New conversation',
              body: 'A new WhatsApp conversation was created.',
              conversationId: payload.new?.id,
            })
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversations' },
          (payload) => {
            const prev = payload.old || {}
            const next = payload.new || {}
            emitter.emit(REALTIME_EVENTS.CONVERSATION_UPDATE, next)

            const assignedChanged =
              Object.prototype.hasOwnProperty.call(prev, 'assigned_to') &&
              prev.assigned_to !== next.assigned_to
            const handedToHuman =
              Object.prototype.hasOwnProperty.call(prev, 'ai_enabled') &&
              prev.ai_enabled === true &&
              next.ai_enabled === false
            const statusChanged =
              Object.prototype.hasOwnProperty.call(prev, 'status') &&
              prev.status !== next.status

            if (assignedChanged || handedToHuman || statusChanged) {
              pushNotification({
                type: 'assignment',
                title: handedToHuman
                  ? 'Assigned to human agent'
                  : assignedChanged
                    ? 'Conversation reassigned'
                    : 'Conversation status changed',
                body: handedToHuman
                  ? 'Conversation assigned for human follow-up.'
                  : `Status: ${next.status || 'updated'}`,
                conversationId: next.id,
              })
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads' },
          (payload) => {
            emitter.emit(REALTIME_EVENTS.LEAD_INSERT, payload.new)
            pushNotification({
              type: 'lead',
              title: 'New lead created',
              body: payload.new?.service || 'A lead was added from chat.',
              leadId: payload.new?.id,
            })
            toast.success('New lead created')
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setConnectionState('connected')
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionState('error')
          }
          emitter.emit(REALTIME_EVENTS.CONNECTION, status)
        })

      const signalChannel = supabase
        .channel('inbox-signals', {
          config: {
            broadcast: { self: false },
            presence: { key: user?.email || user?.name || 'agent' },
          },
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          applyTyping(payload)
          emitter.emit(REALTIME_EVENTS.TYPING, payload)
        })
        .on('presence', { event: 'sync' }, () => {
          const state = signalChannel.presenceState()
          const agents = Object.values(state)
            .flat()
            .map((item) => ({
              userId: item.userId,
              userName: item.userName,
              onlineAt: item.onlineAt,
            }))
          setOnlineAgents(agents)
          emitter.emit(REALTIME_EVENTS.PRESENCE, agents)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && user) {
            await signalChannel.track({
              userId: user.email,
              userName: user.name,
              onlineAt: new Date().toISOString(),
            })
          }
        })

      dataChannelRef.current = dataChannel
      signalChannelRef.current = signalChannel
    }

    start().catch((error) => {
      console.error('[realtime] failed to start', error)
      setConnectionState('error')
    })

    return () => {
      cancelled = true
      typingTimersRef.current.forEach((timer) => clearTimeout(timer))
      typingTimersRef.current.clear()

      if (dataChannelRef.current) {
        supabase.removeChannel(dataChannelRef.current)
        dataChannelRef.current = null
      }
      if (signalChannelRef.current) {
        supabase.removeChannel(signalChannelRef.current)
        signalChannelRef.current = null
      }

      setOnlineAgents([])
      setTypingMap({})
      setConnectionState('idle')
    }
  }, [
    applyTyping,
    bumpUnread,
    isAuthenticated,
    pushNotification,
    realtimeEnabled,
    user,
  ])

  const unreadTotal = useMemo(
    () =>
      Object.values(unreadMap).reduce((sum, value) => sum + Number(value || 0), 0),
    [unreadMap],
  )

  const subscribe = useCallback((event, handler) => {
    return emitterRef.current.on(event, handler)
  }, [])

  const value = useMemo(
    () => ({
      realtimeEnabled,
      connectionState,
      notifications,
      unreadMap,
      unreadTotal,
      typingMap,
      onlineAgents,
      setActiveConversation,
      markConversationRead,
      markNotificationRead,
      clearNotifications,
      broadcastTyping,
      subscribe,
    }),
    [
      realtimeEnabled,
      connectionState,
      notifications,
      unreadMap,
      unreadTotal,
      typingMap,
      onlineAgents,
      setActiveConversation,
      markConversationRead,
      markNotificationRead,
      clearNotifications,
      broadcastTyping,
      subscribe,
    ],
  )

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  )
}
