import { randomBytes, randomUUID } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ApiError } from '../utils/ApiError.js'

const now = () => new Date().toISOString()

const DEV_PROFILE = {
  id: '99999999-9999-9999-9999-999999999001',
  full_name: 'Ayesha Khan',
  email: 'ayesha@nexora.io',
  role: 'ceo',
  avatar_url: null,
}

const state = {
  contacts: [],
  conversations: [],
  messages: [],
  leads: [],
  appointments: [],
  knowledge: [],
  aiSettings: null,
  tags: [],
  handoffs: [],
  profiles: [DEV_PROFILE],
  teamMembers: [
    {
      id: '88888888-8888-8888-8888-888888888001',
      profile_id: DEV_PROFILE.id,
      role: 'ceo',
      status: 'online',
      password: 'demo-password',
      created_at: new Date().toISOString(),
    },
  ],
}

const sessions = new Map()
const authFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/team-auth.json',
)

function loadPersistedTeam() {
  try {
    const saved = JSON.parse(readFileSync(authFile, 'utf8'))
    if (!Array.isArray(saved.profiles) || !Array.isArray(saved.teamMembers)) return
    state.profiles = saved.profiles
    state.teamMembers = saved.teamMembers
    if (!state.profiles.some((profile) => profile.id === DEV_PROFILE.id)) {
      state.profiles.unshift({ ...DEV_PROFILE })
    }
    if (!state.teamMembers.some((member) => member.profile_id === DEV_PROFILE.id)) {
      state.teamMembers.push({
        id: '88888888-8888-8888-8888-888888888001',
        profile_id: DEV_PROFILE.id,
        role: 'ceo',
        status: 'online',
        password: 'demo-password',
        created_at: new Date().toISOString(),
      })
    }
  } catch {
    // First run has no saved team file.
  }
}

function persistTeam() {
  mkdirSync(path.dirname(authFile), { recursive: true })
  writeFileSync(
    authFile,
    JSON.stringify(
      { profiles: state.profiles, teamMembers: state.teamMembers },
      null,
      2,
    ),
  )
}

function sessionUser(profileId) {
  const profile = state.profiles.find((item) => item.id === profileId)
  const member = state.teamMembers.find((item) => item.profile_id === profileId)
  if (!profile || !member || member.status === 'disabled') return null
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: member.role,
    avatar_url: profile.avatar_url || null,
  }
}

loadPersistedTeam()

function attachConversationRelations(item) {
  if (!item) return null
  return {
    ...item,
    contact: state.contacts.find((c) => c.id === item.contact_id) || null,
    assignee:
      state.profiles.find((profile) => profile.id === item.assigned_to) || null,
  }
}

function seed() {
  if (state.contacts.length) return

  const contactIds = {
    hassan: '22222222-2222-2222-2222-222222222001',
    sara: '22222222-2222-2222-2222-222222222002',
    omar: '22222222-2222-2222-2222-222222222003',
  }

  state.contacts = [
    {
      id: contactIds.hassan,
      name: 'Hassan Raza',
      phone: '+923001122334',
      email: 'hassan@brightlabs.co',
      company: 'BrightLabs',
      avatar_url: null,
      notes: 'Interested in WhatsApp CRM',
      created_at: now(),
      updated_at: now(),
    },
    {
      id: contactIds.sara,
      name: 'Sara Ahmed',
      phone: '+923214455667',
      email: 'sara@medora.health',
      company: 'Medora Clinics',
      avatar_url: null,
      notes: 'Appointment reminders',
      created_at: now(),
      updated_at: now(),
    },
    {
      id: contactIds.omar,
      name: 'Omar Siddiqui',
      phone: '+971502233445',
      email: 'omar@coastal.ae',
      company: 'Coastal Realty',
      avatar_url: null,
      notes: 'Property inquiry bot',
      created_at: now(),
      updated_at: now(),
    },
  ]

  state.conversations = [
    {
      id: '33333333-3333-3333-3333-333333333001',
      contact_id: contactIds.hassan,
      status: 'open',
      mode: 'AI_ACTIVE',
      assigned_to: null,
      ai_enabled: true,
      handoff_reason: null,
      handoff_requested_at: null,
      last_message_at: now(),
      created_at: now(),
      updated_at: now(),
    },
    {
      id: '33333333-3333-3333-3333-333333333002',
      contact_id: contactIds.sara,
      status: 'pending',
      mode: 'HUMAN_ACTIVE',
      assigned_to: '99999999-9999-9999-9999-999999999001',
      ai_enabled: false,
      handoff_reason: 'Agent took over the conversation',
      handoff_requested_at: now(),
      last_message_at: now(),
      created_at: now(),
      updated_at: now(),
    },
  ]

  state.handoffs = [
    {
      id: '77777777-7777-7777-7777-777777777001',
      conversation_id: '33333333-3333-3333-3333-333333333002',
      from_mode: 'WAITING_FOR_HUMAN',
      to_mode: 'HUMAN_ACTIVE',
      reason: 'Agent took over the conversation',
      reason_code: 'agent_takeover',
      triggered_by: 'agent',
      actor_id: DEV_PROFILE.id,
      metadata: { actor_name: DEV_PROFILE.full_name },
      created_at: now(),
    },
  ]

  state.messages = [
    {
      id: '44444444-4444-4444-4444-444444444001',
      conversation_id: state.conversations[0].id,
      sender_type: 'customer',
      message: 'Hi, we need a WhatsApp CRM.',
      message_type: 'text',
      whatsapp_message_id: 'wamid.memory.001',
      is_ai: false,
      created_at: now(),
    },
    {
      id: '44444444-4444-4444-4444-444444444002',
      conversation_id: state.conversations[0].id,
      sender_type: 'ai',
      message: 'Happy to help. What features matter most?',
      message_type: 'text',
      whatsapp_message_id: 'wamid.memory.002',
      is_ai: true,
      created_at: now(),
    },
  ]

  state.leads = [
    {
      id: '55555555-5555-5555-5555-555555555001',
      contact_id: contactIds.hassan,
      service: 'Custom CRM Development',
      budget: '$8,000 - $12,000',
      timeline: '4-6 weeks',
      lead_score: 86,
      status: 'qualified',
      source: 'whatsapp',
      notes: 'Hot lead',
      created_at: now(),
      updated_at: now(),
    },
  ]

  state.appointments = [
    {
      id: '66666666-6666-6666-6666-666666666001',
      contact_id: contactIds.hassan,
      title: 'Discovery Call — BrightLabs',
      appointment_date: new Date().toISOString().slice(0, 10),
      appointment_time: '14:30:00',
      status: 'confirmed',
      notes: 'CRM scope discussion',
      created_at: now(),
    },
  ]

  state.knowledge = [
    {
      id: '77777777-7777-7777-7777-777777777001',
      title: 'Pricing & Packages Overview',
      content: 'Starter, Growth, and Enterprise packages.',
      category: 'Sales',
      file_url: null,
      created_by: null,
      created_at: now(),
      updated_at: now(),
    },
  ]

  state.aiSettings = {
    id: '88888888-8888-8888-8888-888888888001',
    agent_name: 'Nexora Support Agent',
    system_prompt:
      'You are a professional customer support assistant for Nexora.',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    enabled: true,
    created_at: now(),
    updated_at: now(),
  }
}

seed()

function paginate(items, { page, limit }) {
  const total = items.length
  const start = (page - 1) * limit
  return {
    data: items.slice(start, start + limit),
    total,
  }
}

function presentTeamMember(item) {
  const profile =
    state.profiles.find((row) => row.id === item.profile_id) || null
  return {
    id: item.id,
    profile_id: item.profile_id,
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || null,
    role: item.role,
    status: item.status,
    password: item.password || null,
    created_at: item.created_at,
  }
}

function requireContact(contactId) {
  const contact = state.contacts.find((item) => item.id === contactId)
  if (!contact) throw new ApiError(400, 'Invalid contact_id')
  return contact
}

export const memoryAuth = {
  login(email, password) {
    const normalized = String(email || '').trim().toLowerCase()
    const profile = state.profiles.find(
      (item) => item.email.toLowerCase() === normalized,
    )
    const member = profile
      ? state.teamMembers.find((item) => item.profile_id === profile.id)
      : null
    if (!profile || !member || member.password !== password) {
      throw new ApiError(401, 'Invalid email or password')
    }
    if (member.status === 'disabled') {
      throw new ApiError(403, 'This account is disabled')
    }
    const token = randomBytes(24).toString('hex')
    sessions.set(token, profile.id)
    return { token, user: sessionUser(profile.id) }
  },
  verify(token) {
    if (token === 'dev-admin-token') {
      return sessionUser(DEV_PROFILE.id)
    }
    const profileId = sessions.get(token)
    if (!profileId) return null
    const user = sessionUser(profileId)
    if (!user) sessions.delete(token)
    return user
  },
}

export const memoryStore = {
  contacts: {
    async list({ page, limit, search }) {
      let items = [...state.contacts].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      if (search) {
        const q = search.toLowerCase()
        items = items.filter((item) =>
          `${item.name} ${item.phone} ${item.email || ''} ${item.company || ''}`
            .toLowerCase()
            .includes(q),
        )
      }
      return paginate(items, { page, limit })
    },
    async getById(id) {
      return state.contacts.find((item) => item.id === id) || null
    },
    async create(payload) {
      if (state.contacts.some((item) => item.phone === payload.phone)) {
        throw new ApiError(409, 'Contact with this phone already exists')
      }
      const row = {
        id: randomUUID(),
        avatar_url: null,
        notes: null,
        email: null,
        company: null,
        ...payload,
        created_at: now(),
        updated_at: now(),
      }
      state.contacts.unshift(row)
      return row
    },
    async upsertByPhone(payload) {
      const existing = state.contacts.find((item) => item.phone === payload.phone)
      if (existing) {
        return this.update(existing.id, payload)
      }
      return this.create(payload)
    },
    async update(id, payload) {
      const index = state.contacts.findIndex((item) => item.id === id)
      if (index < 0) return null
      if (
        payload.phone &&
        state.contacts.some(
          (item) => item.phone === payload.phone && item.id !== id,
        )
      ) {
        throw new ApiError(409, 'Contact with this phone already exists')
      }
      state.contacts[index] = {
        ...state.contacts[index],
        ...payload,
        updated_at: now(),
      }
      return state.contacts[index]
    },
    async remove(id) {
      const index = state.contacts.findIndex((item) => item.id === id)
      if (index < 0) return false
      state.contacts.splice(index, 1)
      state.conversations = state.conversations.filter((c) => c.contact_id !== id)
      state.leads = state.leads.filter((l) => l.contact_id !== id)
      state.appointments = state.appointments.filter((a) => a.contact_id !== id)
      return true
    },
  },

  conversations: {
    async list({ page, limit, status, mode }) {
      let items = [...state.conversations].sort(
        (a, b) =>
          new Date(b.last_message_at || b.created_at) -
          new Date(a.last_message_at || a.created_at),
      )
      if (status) items = items.filter((item) => item.status === status)
      if (mode) items = items.filter((item) => item.mode === mode)
      const result = paginate(items, { page, limit })
      result.data = result.data.map((item) => attachConversationRelations(item))
      return result
    },
    async getById(id) {
      const item = state.conversations.find((row) => row.id === id)
      return attachConversationRelations(item)
    },
    async findOpenByContactId(contactId) {
      const item =
        state.conversations.find(
          (row) =>
            row.contact_id === contactId &&
            row.mode !== 'CLOSED' &&
            ['open', 'pending'].includes(row.status),
        ) || null
      if (!item) return null
      return this.getById(item.id)
    },
    async create(payload) {
      requireContact(payload.contact_id)
      const row = {
        id: randomUUID(),
        status: 'open',
        mode: 'AI_ACTIVE',
        assigned_to: null,
        ai_enabled: true,
        handoff_reason: null,
        handoff_requested_at: null,
        last_message_at: null,
        ...payload,
        created_at: now(),
        updated_at: now(),
      }
      state.conversations.unshift(row)
      return this.getById(row.id)
    },
    async update(id, payload) {
      const index = state.conversations.findIndex((item) => item.id === id)
      if (index < 0) return null
      state.conversations[index] = {
        ...state.conversations[index],
        ...payload,
        updated_at: now(),
      }
      return this.getById(id)
    },
  },

  handoffs: {
    async create(payload) {
      const row = {
        id: randomUUID(),
        metadata: {},
        actor_id: null,
        from_mode: null,
        ...payload,
        created_at: now(),
      }
      state.handoffs.unshift(row)
      return {
        ...row,
        actor: state.profiles.find((profile) => profile.id === row.actor_id) || null,
      }
    },
    async listByConversation(conversationId) {
      return state.handoffs
        .filter((item) => item.conversation_id === conversationId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((item) => ({
          ...item,
          actor:
            state.profiles.find((profile) => profile.id === item.actor_id) || null,
        }))
    },
  },

  messages: {
    async listByConversation(conversationId, { page, limit }) {
      const items = state.messages
        .filter((item) => item.conversation_id === conversationId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      return paginate(items, { page, limit })
    },
    async findByWhatsAppId(whatsappMessageId) {
      if (!whatsappMessageId) return null
      return (
        state.messages.find(
          (item) => item.whatsapp_message_id === whatsappMessageId,
        ) || null
      )
    },
    async updateStatusByWhatsAppId(whatsappMessageId, payload) {
      const index = state.messages.findIndex(
        (item) => item.whatsapp_message_id === whatsappMessageId,
      )
      if (index < 0) return null
      state.messages[index] = {
        ...state.messages[index],
        ...payload,
      }
      return state.messages[index]
    },
    async create(conversationId, payload) {
      const conversation = state.conversations.find(
        (item) => item.id === conversationId,
      )
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      if (payload.whatsapp_message_id) {
        const existing = state.messages.find(
          (item) => item.whatsapp_message_id === payload.whatsapp_message_id,
        )
        if (existing) return existing
      }

      const row = {
        id: randomUUID(),
        conversation_id: conversationId,
        message_type: 'text',
        whatsapp_message_id: null,
        delivery_status: null,
        status_updated_at: null,
        is_ai: payload.sender_type === 'ai',
        ...payload,
        created_at: now(),
      }
      state.messages.push(row)
      conversation.last_message_at = row.created_at
      conversation.updated_at = now()
      return row
    },
  },

  leads: {
    async list({ page, limit, status }) {
      let items = [...state.leads].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      if (status) items = items.filter((item) => item.status === status)
      const result = paginate(items, { page, limit })
      result.data = result.data.map((item) => ({
        ...item,
        contact: state.contacts.find((c) => c.id === item.contact_id) || null,
      }))
      return result
    },
    async getById(id) {
      const item = state.leads.find((row) => row.id === id)
      if (!item) return null
      return {
        ...item,
        contact: state.contacts.find((c) => c.id === item.contact_id) || null,
      }
    },
    async findByContactId(contactId) {
      const item = state.leads.find((row) => row.contact_id === contactId)
      if (!item) return null
      return this.getById(item.id)
    },
    async create(payload) {
      requireContact(payload.contact_id)
      const row = {
        id: randomUUID(),
        service: null,
        budget: null,
        timeline: null,
        lead_score: 0,
        status: 'new',
        source: 'whatsapp',
        notes: null,
        ...payload,
        created_at: now(),
        updated_at: now(),
      }
      state.leads.unshift(row)
      return this.getById(row.id)
    },
    async update(id, payload) {
      const index = state.leads.findIndex((item) => item.id === id)
      if (index < 0) return null
      state.leads[index] = {
        ...state.leads[index],
        ...payload,
        updated_at: now(),
      }
      return this.getById(id)
    },
    async remove(id) {
      const index = state.leads.findIndex((item) => item.id === id)
      if (index < 0) return false
      state.leads.splice(index, 1)
      return true
    },
  },

  appointments: {
    async list({ page, limit, status }) {
      let items = [...state.appointments].sort((a, b) =>
        `${b.appointment_date}${b.appointment_time}`.localeCompare(
          `${a.appointment_date}${a.appointment_time}`,
        ),
      )
      if (status) items = items.filter((item) => item.status === status)
      const result = paginate(items, { page, limit })
      result.data = result.data.map((item) => ({
        ...item,
        contact: state.contacts.find((c) => c.id === item.contact_id) || null,
      }))
      return result
    },
    async create(payload) {
      requireContact(payload.contact_id)
      const row = {
        id: randomUUID(),
        status: 'scheduled',
        notes: null,
        ...payload,
        created_at: now(),
      }
      state.appointments.unshift(row)
      return {
        ...row,
        contact: state.contacts.find((c) => c.id === row.contact_id) || null,
      }
    },
    async update(id, payload) {
      const index = state.appointments.findIndex((item) => item.id === id)
      if (index < 0) return null
      state.appointments[index] = {
        ...state.appointments[index],
        ...payload,
      }
      return {
        ...state.appointments[index],
        contact:
          state.contacts.find(
            (c) => c.id === state.appointments[index].contact_id,
          ) || null,
      }
    },
    async remove(id) {
      const index = state.appointments.findIndex((item) => item.id === id)
      if (index < 0) return false
      state.appointments.splice(index, 1)
      return true
    },
  },

  knowledge: {
    async list({ page, limit, category }) {
      let items = [...state.knowledge].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      if (category) items = items.filter((item) => item.category === category)
      return paginate(items, { page, limit })
    },
    async search(query, limit = 5) {
      const q = String(query || '').toLowerCase()
      return state.knowledge
        .filter((item) =>
          `${item.title} ${item.content} ${item.category || ''}`
            .toLowerCase()
            .includes(q),
        )
        .slice(0, limit)
    },
    async create(payload, userId) {
      const row = {
        id: randomUUID(),
        category: null,
        file_url: null,
        created_by: userId || null,
        ...payload,
        created_at: now(),
        updated_at: now(),
      }
      state.knowledge.unshift(row)
      return row
    },
    async update(id, payload) {
      const index = state.knowledge.findIndex((item) => item.id === id)
      if (index < 0) return null
      state.knowledge[index] = {
        ...state.knowledge[index],
        ...payload,
        updated_at: now(),
      }
      return state.knowledge[index]
    },
    async remove(id) {
      const index = state.knowledge.findIndex((item) => item.id === id)
      if (index < 0) return false
      state.knowledge.splice(index, 1)
      return true
    },
  },

  aiSettings: {
    async get() {
      return state.aiSettings
    },
    async update(payload) {
      state.aiSettings = {
        ...state.aiSettings,
        ...payload,
        updated_at: now(),
      }
      return state.aiSettings
    },
  },

  teamMembers: {
    async list({ page, limit, search }) {
      let items = [...state.teamMembers].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      items = items.map((item) => presentTeamMember(item))
      if (search) {
        const q = search.toLowerCase()
        items = items.filter((item) =>
          `${item.full_name} ${item.email} ${item.role}`.toLowerCase().includes(q),
        )
      }
      return paginate(items, { page, limit })
    },
    async getById(id) {
      const item = state.teamMembers.find((row) => row.id === id)
      return item ? presentTeamMember(item) : null
    },
    async create(payload) {
      const email = payload.email.trim().toLowerCase()
      if (state.profiles.some((profile) => profile.email.toLowerCase() === email)) {
        throw new ApiError(409, 'A team member with this email already exists')
      }
      const profile = {
        id: randomUUID(),
        full_name: payload.full_name.trim(),
        email,
        role: payload.role,
        avatar_url: null,
      }
      const row = {
        id: randomUUID(),
        profile_id: profile.id,
        role: payload.role,
        status: payload.status || 'offline',
        password: payload.password,
        created_at: now(),
      }
      state.profiles.push(profile)
      state.teamMembers.unshift(row)
      persistTeam()
      return presentTeamMember(row)
    },
    async update(id, payload) {
      const index = state.teamMembers.findIndex((row) => row.id === id)
      if (index < 0) return null
      const current = state.teamMembers[index]
      const next = {
        ...current,
        role: payload.role || current.role,
        status: payload.status || current.status,
        password: payload.password || current.password || null,
      }
      state.teamMembers[index] = next
      const profile = state.profiles.find((item) => item.id === current.profile_id)
      if (profile) {
        if (payload.full_name) profile.full_name = payload.full_name.trim()
        if (payload.role) profile.role = payload.role
      }
      persistTeam()
      return presentTeamMember(next)
    },
    async remove(id) {
      const index = state.teamMembers.findIndex((row) => row.id === id)
      if (index < 0) return false
      const [removed] = state.teamMembers.splice(index, 1)
      const assigned = state.conversations.some(
        (conversation) => conversation.assigned_to === removed.profile_id,
      )
      if (!assigned) {
        const profileIndex = state.profiles.findIndex(
          (profile) => profile.id === removed.profile_id,
        )
        if (profileIndex >= 0) state.profiles.splice(profileIndex, 1)
      }
      persistTeam()
      return true
    },
  },

  analytics: {
    async overview() {
      const qualified = state.leads.filter((l) =>
        ['qualified', 'proposal', 'won'].includes(l.status),
      ).length
      const aiMessages = state.messages.filter((m) => m.is_ai).length
      const totalMessages = state.messages.length || 1

      return {
        total_contacts: state.contacts.length,
        total_conversations: state.conversations.length,
        active_conversations: state.conversations.filter((c) =>
          ['open', 'pending'].includes(c.status),
        ).length,
        total_messages: state.messages.length,
        total_leads: state.leads.length,
        new_leads: state.leads.filter((l) => l.status === 'new').length,
        qualified_leads: qualified,
        total_appointments: state.appointments.length,
        upcoming_appointments: state.appointments.filter((a) =>
          ['scheduled', 'confirmed'].includes(a.status),
        ).length,
        knowledge_articles: state.knowledge.length,
        ai_resolution_rate: Math.round((aiMessages / totalMessages) * 100),
        average_lead_score:
          state.leads.length === 0
            ? 0
            : Math.round(
                state.leads.reduce((sum, lead) => sum + lead.lead_score, 0) /
                  state.leads.length,
              ),
      }
    },
  },
}
