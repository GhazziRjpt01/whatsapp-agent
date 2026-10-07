import { getSupabaseAdmin, handleSupabase } from '../config/supabase.js'
import { ApiError } from '../utils/ApiError.js'
import { buildIlikeOrFilter } from './searchSafe.js'

function presentSupabaseTeamMember(row) {
  const profile = row.profile || {}
  return {
    id: row.id,
    profile_id: row.profile_id,
    full_name: profile.full_name || '',
    email: profile.email || '',
    avatar_url: profile.avatar_url || null,
    role: row.role,
    status: row.status,
    password: row.password || null,
    created_at: row.created_at,
  }
}

async function ensureContactExists(contactId) {
  const supabase = getSupabaseAdmin()
  const { data } = await handleSupabase(
    supabase.from('contacts').select('id').eq('id', contactId).maybeSingle(),
  )
  if (!data) throw new ApiError(400, 'Invalid contact_id')
}

export const supabaseStore = {
  contacts: {
    async list({ page, limit, from, to, search }) {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      const searchFilter = buildIlikeOrFilter(
        ['name', 'phone', 'email', 'company'],
        search,
      )
      if (searchFilter) {
        query = query.or(searchFilter)
      }

      const { data, count } = await handleSupabase(query)
      return { data, total: count || 0 }
    },
    async getById(id) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase.from('contacts').select('*').eq('id', id).maybeSingle(),
      )
      return data
    },
    async create(payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase.from('contacts').insert(payload).select('*').single(),
        'Failed to create contact',
      )
      return data
    },
    async upsertByPhone(payload) {
      const supabase = getSupabaseAdmin()
      const { data: existing } = await handleSupabase(
        supabase
          .from('contacts')
          .select('*')
          .eq('phone', payload.phone)
          .maybeSingle(),
      )
      if (existing) {
        return this.update(existing.id, payload)
      }
      return this.create(payload)
    },
    async update(id, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('contacts')
          .update(payload)
          .eq('id', id)
          .select('*')
          .maybeSingle(),
        'Failed to update contact',
      )
      return data
    },
    async remove(id) {
      const supabase = getSupabaseAdmin()
      const existing = await this.getById(id)
      if (!existing) return false
      await handleSupabase(supabase.from('contacts').delete().eq('id', id))
      return true
    },
  },

  conversations: {
    async list({ from, to, status, mode }) {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('conversations')
        .select(
          '*, contact:contacts(*), assignee:profiles!conversations_assigned_to_fkey(*)',
          { count: 'exact' },
        )
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (status) query = query.eq('status', status)
      if (mode) query = query.eq('mode', mode)

      const { data, count } = await handleSupabase(query)
      return { data, total: count || 0 }
    },
    async getById(id) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversations')
          .select(
            '*, contact:contacts(*), assignee:profiles!conversations_assigned_to_fkey(*)',
          )
          .eq('id', id)
          .maybeSingle(),
      )
      return data
    },
    async findOpenByContactId(contactId) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversations')
          .select(
            '*, contact:contacts(*), assignee:profiles!conversations_assigned_to_fkey(*)',
          )
          .eq('contact_id', contactId)
          .neq('mode', 'CLOSED')
          .in('status', ['open', 'pending'])
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      )
      return data
    },
    async create(payload) {
      await ensureContactExists(payload.contact_id)
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversations')
          .insert({
            mode: 'AI_ACTIVE',
            ai_enabled: true,
            ...payload,
          })
          .select(
            '*, contact:contacts(*), assignee:profiles!conversations_assigned_to_fkey(*)',
          )
          .single(),
      )
      return data
    },
    async update(id, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversations')
          .update(payload)
          .eq('id', id)
          .select(
            '*, contact:contacts(*), assignee:profiles!conversations_assigned_to_fkey(*)',
          )
          .maybeSingle(),
      )
      return data
    },
  },

  handoffs: {
    async create(payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversation_handoffs')
          .insert(payload)
          .select('*, actor:profiles(*)')
          .single(),
      )
      return data
    },
    async listByConversation(conversationId) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('conversation_handoffs')
          .select('*, actor:profiles(*)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false }),
      )
      return data || []
    },
  },

  messages: {
    async listByConversation(conversationId, { from, to }) {
      const supabase = getSupabaseAdmin()
      const conversation = await supabaseStore.conversations.getById(
        conversationId,
      )
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      const { data, count } = await handleSupabase(
        supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .range(from, to),
      )
      return { data, total: count || 0 }
    },
    async findByWhatsAppId(whatsappMessageId) {
      if (!whatsappMessageId) return null
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('messages')
          .select('*')
          .eq('whatsapp_message_id', whatsappMessageId)
          .maybeSingle(),
      )
      return data
    },
    async updateStatusByWhatsAppId(whatsappMessageId, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('messages')
          .update(payload)
          .eq('whatsapp_message_id', whatsappMessageId)
          .select('*')
          .maybeSingle(),
      )
      return data
    },
    async create(conversationId, payload) {
      const conversation = await supabaseStore.conversations.getById(
        conversationId,
      )
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      if (payload.whatsapp_message_id) {
        const existing = await this.findByWhatsAppId(payload.whatsapp_message_id)
        if (existing) return existing
      }

      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            is_ai: payload.sender_type === 'ai',
            ...payload,
          })
          .select('*')
          .single(),
      )
      return data
    },
  },

  leads: {
    async list({ from, to, status }) {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('leads')
        .select('*, contact:contacts(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (status) query = query.eq('status', status)

      const { data, count } = await handleSupabase(query)
      return { data, total: count || 0 }
    },
    async getById(id) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('leads')
          .select('*, contact:contacts(*)')
          .eq('id', id)
          .maybeSingle(),
      )
      return data
    },
    async findByContactId(contactId) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('leads')
          .select('*, contact:contacts(*)')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      )
      return data
    },
    async create(payload) {
      await ensureContactExists(payload.contact_id)
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('leads')
          .insert(payload)
          .select('*, contact:contacts(*)')
          .single(),
      )
      return data
    },
    async update(id, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('leads')
          .update(payload)
          .eq('id', id)
          .select('*, contact:contacts(*)')
          .maybeSingle(),
      )
      return data
    },
    async remove(id) {
      const existing = await this.getById(id)
      if (!existing) return false
      const supabase = getSupabaseAdmin()
      await handleSupabase(supabase.from('leads').delete().eq('id', id))
      return true
    },
  },

  appointments: {
    async list({ from, to, status }) {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('appointments')
        .select('*, contact:contacts(*)', { count: 'exact' })
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .range(from, to)

      if (status) query = query.eq('status', status)

      const { data, count } = await handleSupabase(query)
      return { data, total: count || 0 }
    },
    async create(payload) {
      await ensureContactExists(payload.contact_id)
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('appointments')
          .insert(payload)
          .select('*, contact:contacts(*)')
          .single(),
      )
      return data
    },
    async update(id, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('appointments')
          .update(payload)
          .eq('id', id)
          .select('*, contact:contacts(*)')
          .maybeSingle(),
      )
      return data
    },
    async remove(id) {
      const supabase = getSupabaseAdmin()
      const { data: existing } = await handleSupabase(
        supabase.from('appointments').select('id').eq('id', id).maybeSingle(),
      )
      if (!existing) return false
      await handleSupabase(supabase.from('appointments').delete().eq('id', id))
      return true
    },
  },

  knowledge: {
    async list({ from, to, category }) {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('knowledge_base')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (category) query = query.eq('category', category)

      const { data, count } = await handleSupabase(query)
      return { data, total: count || 0 }
    },
    async search(query, limit = 5) {
      const supabase = getSupabaseAdmin()
      const searchFilter = buildIlikeOrFilter(
        ['title', 'content', 'category'],
        query,
      )
      if (!searchFilter) return []

      const { data } = await handleSupabase(
        supabase
          .from('knowledge_base')
          .select('*')
          .or(searchFilter)
          .order('updated_at', { ascending: false })
          .limit(limit),
      )
      return data || []
    },
    async create(payload, userId) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('knowledge_base')
          .insert({ ...payload, created_by: userId || null })
          .select('*')
          .single(),
      )
      return data
    },
    async update(id, payload) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('knowledge_base')
          .update(payload)
          .eq('id', id)
          .select('*')
          .maybeSingle(),
      )
      return data
    },
    async remove(id) {
      const supabase = getSupabaseAdmin()
      const { data: existing } = await handleSupabase(
        supabase.from('knowledge_base').select('id').eq('id', id).maybeSingle(),
      )
      if (!existing) return false
      await handleSupabase(supabase.from('knowledge_base').delete().eq('id', id))
      return true
    },
  },

  aiSettings: {
    async get() {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('ai_settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
      )
      return data
    },
    async update(payload) {
      const supabase = getSupabaseAdmin()
      const existing = await this.get()

      if (!existing) {
        const { data } = await handleSupabase(
          supabase.from('ai_settings').insert(payload).select('*').single(),
        )
        return data
      }

      const { data } = await handleSupabase(
        supabase
          .from('ai_settings')
          .update(payload)
          .eq('id', existing.id)
          .select('*')
          .single(),
      )
      return data
    },
  },

  teamMembers: {
    async list({ page, limit, from, to, search }) {
      const supabase = getSupabaseAdmin()
      let profileIds = null
      const searchFilter = buildIlikeOrFilter(['full_name', 'email'], search)
      if (searchFilter) {
        const { data: profiles } = await handleSupabase(
          supabase.from('profiles').select('id').or(searchFilter),
        )
        profileIds = (profiles || []).map((profile) => profile.id)
        if (profileIds.length === 0) return { data: [], total: 0 }
      }

      let query = supabase
        .from('team_members')
        .select(
          'id, profile_id, role, status, password, created_at, profile:profiles(full_name, email, avatar_url)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (profileIds) query = query.in('profile_id', profileIds)

      const { data, count } = await handleSupabase(query)
      return {
        data: (data || []).map(presentSupabaseTeamMember),
        total: count || 0,
      }
    },
    async getById(id) {
      const supabase = getSupabaseAdmin()
      const { data } = await handleSupabase(
        supabase
          .from('team_members')
          .select(
            'id, profile_id, role, status, password, created_at, profile:profiles(full_name, email, avatar_url)',
          )
          .eq('id', id)
          .maybeSingle(),
      )
      return data ? presentSupabaseTeamMember(data) : null
    },
    async create(payload) {
      if (!payload.password) {
        throw new ApiError(400, 'Password is required to add a team member')
      }
      const supabase = getSupabaseAdmin()
      const email = payload.email.trim().toLowerCase()
      const { data: existing } = await handleSupabase(
        supabase.from('profiles').select('id').eq('email', email).maybeSingle(),
      )
      if (existing) {
        throw new ApiError(409, 'A team member with this email already exists')
      }

      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.full_name.trim() },
      })
      if (error || !created?.user) {
        throw new ApiError(
          error?.status || 400,
          error?.message || 'Failed to create team member',
        )
      }

      const userId = created.user.id
      try {
        await handleSupabase(
          supabase
            .from('profiles')
            .update({
              full_name: payload.full_name.trim(),
              role: payload.role,
            })
            .eq('id', userId),
          'Failed to update team profile',
        )
        const { data } = await handleSupabase(
          supabase
            .from('team_members')
            .insert({
              profile_id: userId,
              role: payload.role,
              status: payload.status || 'offline',
              password: payload.password,
            })
            .select(
              'id, profile_id, role, status, password, created_at, profile:profiles(full_name, email, avatar_url)',
            )
            .single(),
          'Failed to add team member',
        )
        return presentSupabaseTeamMember(data)
      } catch (err) {
        await supabase.auth.admin.deleteUser(userId)
        throw err
      }
    },
    async update(id, payload) {
      const existing = await this.getById(id)
      if (!existing) return null
      const supabase = getSupabaseAdmin()
      const memberPatch = {}
      if (payload.role) memberPatch.role = payload.role
      if (payload.status) memberPatch.status = payload.status
      if (payload.password) {
        memberPatch.password = payload.password
        const { error } = await supabase.auth.admin.updateUserById(
          existing.profile_id,
          { password: payload.password },
        )
        if (error) {
          throw new ApiError(400, error.message || 'Failed to update password')
        }
      }
      if (Object.keys(memberPatch).length > 0) {
        await handleSupabase(
          supabase.from('team_members').update(memberPatch).eq('id', id),
          'Failed to update team member',
        )
      }
      const profilePatch = {}
      if (payload.full_name) profilePatch.full_name = payload.full_name.trim()
      if (payload.role) profilePatch.role = payload.role
      if (Object.keys(profilePatch).length > 0) {
        await handleSupabase(
          supabase
            .from('profiles')
            .update(profilePatch)
            .eq('id', existing.profile_id),
          'Failed to update team profile',
        )
      }
      return this.getById(id)
    },
    async remove(id) {
      const existing = await this.getById(id)
      if (!existing) return false
      const supabase = getSupabaseAdmin()
      await handleSupabase(
        supabase.from('team_members').delete().eq('id', id),
        'Failed to remove team member',
      )
      return true
    },
  },

  analytics: {
    async overview() {
      const supabase = getSupabaseAdmin()

      const [
        contacts,
        conversations,
        activeConversations,
        messages,
        leads,
        newLeads,
        qualifiedLeads,
        appointments,
        upcomingAppointments,
        knowledge,
        aiMessages,
      ] = await Promise.all([
        handleSupabase(
          supabase.from('contacts').select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'pending']),
        ),
        handleSupabase(
          supabase.from('messages').select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase.from('leads').select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'new'),
        ),
        handleSupabase(
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .in('status', ['qualified', 'proposal', 'won']),
        ),
        handleSupabase(
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .in('status', ['scheduled', 'confirmed']),
        ),
        handleSupabase(
          supabase
            .from('knowledge_base')
            .select('*', { count: 'exact', head: true }),
        ),
        handleSupabase(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_ai', true),
        ),
      ])

      const { data: leadScores } = await handleSupabase(
        supabase.from('leads').select('lead_score'),
      )

      const totalMessages = messages.count || 0
      const averageLeadScore =
        !leadScores || leadScores.length === 0
          ? 0
          : Math.round(
              leadScores.reduce((sum, row) => sum + (row.lead_score || 0), 0) /
                leadScores.length,
            )

      return {
        total_contacts: contacts.count || 0,
        total_conversations: conversations.count || 0,
        active_conversations: activeConversations.count || 0,
        total_messages: totalMessages,
        total_leads: leads.count || 0,
        new_leads: newLeads.count || 0,
        qualified_leads: qualifiedLeads.count || 0,
        total_appointments: appointments.count || 0,
        upcoming_appointments: upcomingAppointments.count || 0,
        knowledge_articles: knowledge.count || 0,
        ai_resolution_rate:
          totalMessages === 0
            ? 0
            : Math.round(((aiMessages.count || 0) / totalMessages) * 100),
        average_lead_score: averageLeadScore,
      }
    },
  },
}
