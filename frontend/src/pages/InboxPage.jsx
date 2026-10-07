import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  Building2,
  Handshake,
  History,
  Loader2,
  Mail,
  Paperclip,
  Phone,
  Radio,
  Send,
  Smile,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { cn } from '@/lib/utils'
import { initials, formatRelative, formatTime } from '@/lib/format'
import { getErrorMessage } from '@/services/api'
import {
  getConversation,
  listConversations,
  listHandoffs,
  listMessages,
  returnConversationToAi,
  sendMessage,
  takeOverConversation,
} from '@/services/conversations.service'
import { createLead } from '@/services/leads.service'
import { useRealtime } from '@/hooks/useRealtime'
import { REALTIME_EVENTS } from '@/realtime/events'
import {
  CONVERSATION_MODES,
  assigneeName,
  modeBadgeVariant,
  modeLabel,
  resolveConversationMode,
} from '@/lib/handoff'

function sortConversations(rows) {
  return [...rows].sort((a, b) => {
    const left = new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime()
    const right = new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime()
    return right - left
  })
}

export default function InboxPage() {
  const {
    connectionState,
    realtimeEnabled,
    unreadMap,
    typingMap,
    onlineAgents,
    setActiveConversation,
    broadcastTyping,
    subscribe,
  } = useRealtime()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [handoffBusy, setHandoffBusy] = useState(false)
  const [handoffs, setHandoffs] = useState([])
  const [error, setError] = useState(null)
  const activeIdRef = useRef(null)
  const conversationsRef = useRef([])
  const typingTimeoutRef = useRef(null)

  const active = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId],
  )

  const activeTyping = typingMap[activeId] || []
  const activeMode = resolveConversationMode(active || {})

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return conversations.filter((item) => {
      const mode = resolveConversationMode(item)
      const haystack =
        `${item.contact?.name || ''} ${item.contact?.phone || ''} ${item.status} ${mode}`
          .toLowerCase()
      const matchesQuery = !q || haystack.includes(q)
      const matchesStatus =
        statusFilter === 'all' ||
        item.status === statusFilter ||
        mode === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [conversations, query, statusFilter])

  const loadHandoffs = useCallback(async (conversationId) => {
    if (!conversationId) {
      setHandoffs([])
      return
    }
    try {
      const rows = await listHandoffs(conversationId)
      setHandoffs(rows || [])
    } catch {
      setHandoffs([])
    }
  }, [])

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingList(true)
    setError(null)
    try {
      const result = await listConversations({ page: 1, limit: 50 })
      const rows = sortConversations(result.data || [])
      setConversations(rows)
      setActiveId((current) => current || rows[0]?.id || null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId) return
    if (!silent) setLoadingMessages(true)
    try {
      const result = await listMessages(conversationId, { page: 1, limit: 100 })
      setMessages(result.data || [])
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    activeIdRef.current = activeId
    setActiveConversation(activeId)
    if (activeId) {
      loadMessages(activeId)
      loadHandoffs(activeId)
    } else {
      setHandoffs([])
    }
  }, [activeId, loadHandoffs, loadMessages, setActiveConversation])

  // Listen only — channels live in RealtimeProvider (one shared subscription).
  useEffect(() => {
    const unsubs = [
      subscribe(REALTIME_EVENTS.MESSAGE_INSERT, (row) => {
        if (!row?.id) return

        const known = conversationsRef.current.some(
          (item) => item.id === row.conversation_id,
        )

        setConversations((prev) => {
          const exists = prev.some((item) => item.id === row.conversation_id)
          const next = exists
            ? prev.map((item) =>
                item.id === row.conversation_id
                  ? {
                      ...item,
                      last_message_at: row.created_at,
                      updated_at: row.created_at,
                    }
                  : item,
              )
            : prev
          return sortConversations(next)
        })

        if (activeIdRef.current === row.conversation_id) {
          setMessages((prev) => {
            if (prev.some((item) => item.id === row.id)) return prev
            const tempIndex = prev.findIndex(
              (item) =>
                String(item.id).startsWith('temp-') &&
                item.message === row.message,
            )
            if (tempIndex >= 0) {
              const clone = [...prev]
              clone[tempIndex] = row
              return clone
            }
            return [...prev, row]
          })
        } else if (!known && row.conversation_id) {
          getConversation(row.conversation_id)
            .then((conversation) => {
              setConversations((prev) => {
                if (prev.some((item) => item.id === conversation.id)) return prev
                return sortConversations([conversation, ...prev])
              })
            })
            .catch(() => {})
        }
      }),
      subscribe(REALTIME_EVENTS.MESSAGE_UPDATE, (row) => {
        if (!row?.id) return
        if (activeIdRef.current !== row.conversation_id) return
        setMessages((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, ...row } : item)),
        )
      }),
      subscribe(REALTIME_EVENTS.CONVERSATION_UPDATE, (row) => {
        if (!row?.id) return
        setConversations((prev) =>
          sortConversations(
            prev.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    ...row,
                    contact: item.contact,
                  }
                : item,
            ),
          ),
        )
      }),
      subscribe(REALTIME_EVENTS.CONVERSATION_INSERT, (row) => {
        if (!row?.id) return
        getConversation(row.id)
          .then((conversation) => {
            setConversations((prev) => {
              if (prev.some((item) => item.id === conversation.id)) {
                return sortConversations(
                  prev.map((item) =>
                    item.id === conversation.id ? conversation : item,
                  ),
                )
              }
              return sortConversations([conversation, ...prev])
            })
          })
          .catch(() => {
            setConversations((prev) => {
              if (prev.some((item) => item.id === row.id)) return prev
              return sortConversations([row, ...prev])
            })
          })
      }),
    ]

    return () => {
      unsubs.forEach((unsub) => unsub?.())
    }
  }, [subscribe])

  // Fallback polling only when Supabase realtime is unavailable.
  useEffect(() => {
    if (realtimeEnabled && connectionState === 'connected') return undefined
    const timer = setInterval(() => {
      loadConversations({ silent: true })
      if (activeIdRef.current) {
        loadMessages(activeIdRef.current, { silent: true })
      }
    }, 8000)
    return () => clearInterval(timer)
  }, [connectionState, loadConversations, loadMessages, realtimeEnabled])

  const handleDraftChange = (value) => {
    setDraft(value)
    if (!activeId) return
    broadcastTyping(activeId, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(activeId, false)
    }, 1200)
  }

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (activeId) broadcastTyping(activeId, false)
    },
    [activeId, broadcastTyping],
  )

  const handleSend = async () => {
    if (!active || !draft.trim()) return
    const text = draft.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      conversation_id: active.id,
      sender_type: 'agent',
      message: text,
      message_type: 'text',
      is_ai: false,
      created_at: new Date().toISOString(),
      pending: true,
    }

    setDraft('')
    broadcastTyping(active.id, false)
    setMessages((prev) => [...prev, optimistic])
    setSending(true)

    try {
      const created = await sendMessage(active.id, {
        sender_type: 'agent',
        message: text,
        message_type: 'text',
      })
      setMessages((prev) =>
        prev.map((item) => (item.id === tempId ? created : item)),
      )
      const refreshed = await getConversation(active.id).catch(() => null)
      setConversations((prev) =>
        sortConversations(
          prev.map((item) =>
            item.id === active.id
              ? {
                  ...(refreshed || item),
                  last_message_at: created.created_at,
                }
              : item,
          ),
        ),
      )
      loadHandoffs(active.id)
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item.id !== tempId))
      setDraft(text)
      toast.error(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const handleCreateLead = async () => {
    if (!active?.contact_id && !active?.contact?.id) {
      toast.error('No contact linked to this conversation')
      return
    }
    try {
      await createLead({
        contact_id: active.contact_id || active.contact.id,
        service: 'WhatsApp inquiry',
        status: 'new',
        source: 'inbox',
        lead_score: 50,
      })
      toast.success('Lead created from conversation')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const applyConversationUpdate = (updated) => {
    setConversations((prev) =>
      sortConversations(
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      ),
    )
  }

  const handleTakeOver = async () => {
    if (!active) return
    setHandoffBusy(true)
    try {
      const result = await takeOverConversation(active.id)
      applyConversationUpdate(result.conversation)
      await loadMessages(active.id, { silent: true })
      await loadHandoffs(active.id)
      toast.success(
        result.unchanged
          ? 'You already own this conversation'
          : 'You took over this conversation — AI replies are paused',
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setHandoffBusy(false)
    }
  }

  const handleReturnToAi = async () => {
    if (!active) return
    setHandoffBusy(true)
    try {
      const result = await returnConversationToAi(active.id)
      applyConversationUpdate(result.conversation)
      await loadMessages(active.id, { silent: true })
      await loadHandoffs(active.id)
      toast.success(
        result.unchanged
          ? 'Conversation already with AI'
          : 'Conversation returned to AI',
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setHandoffBusy(false)
    }
  }

  if (error) {
    return <ErrorState description={error} onRetry={loadConversations} />
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[640px] flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Live updates via Supabase Realtime — no page refresh required.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              connectionState === 'connected'
                ? 'success'
                : connectionState === 'disabled'
                  ? 'secondary'
                  : 'warning'
            }
            className="gap-1"
          >
            <Radio className="h-3.5 w-3.5" />
            {connectionState === 'connected'
              ? 'Realtime live'
              : connectionState === 'disabled'
                ? 'Realtime offline (polling)'
                : connectionState}
          </Badge>
          <Badge variant="outline">
            {onlineAgents.length} agent{onlineAgents.length === 1 ? '' : 's'} online
          </Badge>
        </div>
      </div>

      <Card className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <p className="text-sm font-semibold">Conversations</p>
            <Input
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[
                'all',
                'AI_ACTIVE',
                'WAITING_FOR_HUMAN',
                'HUMAN_ACTIVE',
                'CLOSED',
              ].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={statusFilter === value ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(value)}
                >
                  {value === 'all' ? 'all' : modeLabel(value)}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {loadingList ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : filtered.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No conversations"
                    description="Inbound WhatsApp chats will show up here."
                  />
                </div>
              ) : (
                filtered.map((conversation) => {
                  const unread = unreadMap[conversation.id] || 0
                  const typing = typingMap[conversation.id] || []
                  const mode = resolveConversationMode(conversation)
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      className={cn(
                        'flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200',
                        activeId === conversation.id
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'hover:bg-muted',
                      )}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>
                            {initials(conversation.contact?.name || 'NA')}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card',
                            mode === CONVERSATION_MODES.AI_ACTIVE
                              ? 'bg-emerald-500'
                              : mode === CONVERSATION_MODES.WAITING_FOR_HUMAN
                                ? 'bg-amber-400'
                                : mode === CONVERSATION_MODES.HUMAN_ACTIVE
                                  ? 'bg-sky-500'
                                  : 'bg-slate-400',
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {conversation.contact?.name || 'Unknown'}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatRelative(conversation.last_message_at)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">
                            {typing.length > 0
                              ? `${typing[0].userName || 'Someone'} is typing...`
                              : conversation.assignee?.full_name ||
                                conversation.contact?.phone ||
                                modeLabel(mode)}
                          </p>
                          <div className="flex items-center gap-1">
                            {unread > 0 ? (
                              <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
                                {unread}
                              </Badge>
                            ) : (
                              <Badge variant={modeBadgeVariant(mode)}>
                                {modeLabel(mode)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </section>

        <section className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a conversation"
                description="Choose a chat from the left to view live messages."
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {initials(active.contact?.name || 'NA')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {active.contact?.name || 'Unknown'}
                        </p>
                        <Badge variant={modeBadgeVariant(activeMode)}>
                          {modeLabel(activeMode)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {active.contact?.company || '—'} · Assigned:{' '}
                        {assigneeName(active)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">WhatsApp</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={
                      handoffBusy ||
                      activeMode === CONVERSATION_MODES.HUMAN_ACTIVE ||
                      activeMode === CONVERSATION_MODES.CLOSED
                    }
                    onClick={handleTakeOver}
                  >
                    {handoffBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Handshake className="h-3.5 w-3.5" />
                    )}
                    Take Over
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={
                      handoffBusy ||
                      activeMode === CONVERSATION_MODES.AI_ACTIVE ||
                      activeMode === CONVERSATION_MODES.CLOSED
                    }
                    onClick={handleReturnToAi}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Return to AI
                  </Button>
                </div>
                {active.handoff_reason ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Handoff reason: {active.handoff_reason}
                  </p>
                ) : null}
              </div>

              <ScrollArea className="flex-1 bg-[linear-gradient(180deg,rgba(15,118,110,0.03),transparent_180px)]">
                <div className="space-y-4 p-4 md:p-6">
                  {loadingMessages ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-2/3" />
                    ))
                  ) : messages.length === 0 ? (
                    <EmptyState
                      title="No messages yet"
                      description="Send the first reply to start the thread."
                    />
                  ) : (
                    messages.map((message) => {
                      if (message.sender_type === 'system') {
                        return (
                          <div
                            key={message.id}
                            className="flex justify-center px-4"
                          >
                            <div className="max-w-[90%] rounded-full border border-border bg-muted/70 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                              {message.message}
                            </div>
                          </div>
                        )
                      }

                      const isCustomer = message.sender_type === 'customer'
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            isCustomer ? 'justify-start' : 'justify-end',
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[70%]',
                              isCustomer
                                ? 'rounded-tl-md border border-border bg-card'
                                : message.sender_type === 'ai'
                                  ? 'rounded-tr-md bg-teal-700 text-white'
                                  : 'rounded-tr-md bg-slate-900 text-white',
                              message.pending && 'opacity-70',
                            )}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[11px] opacity-80">
                              {message.sender_type === 'ai' ? (
                                <>
                                  <Bot className="h-3.5 w-3.5" /> AI Agent
                                </>
                              ) : message.sender_type === 'customer' ? (
                                'Customer'
                              ) : (
                                <>
                                  <Users className="h-3.5 w-3.5" /> Agent
                                </>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            <p className="mt-2 text-right text-[11px] opacity-70">
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}

                  {activeTyping.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" />
                      </span>
                      {activeTyping[0].userName || 'Someone'} is typing...
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-3 md:p-4">
                {activeMode === CONVERSATION_MODES.AI_ACTIVE ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    AI is auto-replying. Use Take Over to pause AI and reply as a human.
                  </p>
                ) : null}
                {activeMode === CONVERSATION_MODES.WAITING_FOR_HUMAN ? (
                  <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
                    Waiting for a human — AI auto-replies are paused.
                  </p>
                ) : null}
                <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
                  <Textarea
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder={
                      activeMode === CONVERSATION_MODES.CLOSED
                        ? 'Conversation is closed'
                        : 'Write a reply via WhatsApp...'
                    }
                    disabled={activeMode === CONVERSATION_MODES.CLOSED}
                    className="min-h-[72px] resize-none border-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-between gap-2 px-1 pb-1">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Attach file"
                        disabled
                        title="Attachments coming soon"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        aria-label="Insert emoji"
                        disabled
                        title="Emoji picker coming soon"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={
                        sending ||
                        !draft.trim() ||
                        activeMode === CONVERSATION_MODES.CLOSED
                      }
                      onClick={handleSend}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="soft-scroll min-h-0 overflow-y-auto p-4">
          {!active ? (
            <EmptyState
              title="Customer profile"
              description="Select a conversation to inspect contact details."
            />
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <Avatar className="mx-auto h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {initials(active.contact?.name || 'NA')}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-3 text-lg font-semibold">
                  {active.contact?.name || 'Unknown'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {active.contact?.company || 'No company'}
                </p>
                <Badge className="mt-2" variant={modeBadgeVariant(activeMode)}>
                  {modeLabel(activeMode)}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <InfoRow icon={Phone} label="Phone" value={active.contact?.phone || '—'} />
                <InfoRow icon={Mail} label="Email" value={active.contact?.email || '—'} />
                <InfoRow
                  icon={Building2}
                  label="Company"
                  value={active.contact?.company || '—'}
                />
                <InfoRow
                  icon={Users}
                  label="Assigned team member"
                  value={assigneeName(active)}
                />
                <InfoRow
                  icon={Handshake}
                  label="Conversation mode"
                  value={modeLabel(activeMode)}
                />
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Handoff audit
                </p>
                <div className="space-y-2">
                  {handoffs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No handoffs yet</p>
                  ) : (
                    handoffs.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-muted/50 px-3 py-2 text-xs"
                      >
                        <p className="font-medium">
                          {item.from_mode || '—'} → {item.to_mode}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {item.reason || item.reason_code}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.triggered_by}
                          {item.actor?.full_name ? ` · ${item.actor.full_name}` : ''}
                          {' · '}
                          {formatRelative(item.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Online agents
                </p>
                <div className="space-y-2">
                  {onlineAgents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No agents online</p>
                  ) : (
                    onlineAgents.map((agent) => (
                      <div
                        key={agent.userId}
                        className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {agent.userName || agent.userId}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Button className="w-full" onClick={handleCreateLead}>
                  <UserPlus className="h-4 w-4" />
                  Create lead
                </Button>
                <Button
                  className="w-full"
                  disabled={
                    handoffBusy ||
                    activeMode === CONVERSATION_MODES.HUMAN_ACTIVE ||
                    activeMode === CONVERSATION_MODES.CLOSED
                  }
                  onClick={handleTakeOver}
                >
                  <Handshake className="h-4 w-4" />
                  Take Over
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={
                    handoffBusy ||
                    activeMode === CONVERSATION_MODES.AI_ACTIVE ||
                    activeMode === CONVERSATION_MODES.CLOSED
                  }
                  onClick={handleReturnToAi}
                >
                  <Bot className="h-4 w-4" />
                  Return to AI
                </Button>
              </div>
            </div>
          )}
        </section>
      </Card>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
