import { db } from '../db/client.js'
import { aiLogger } from './logger.js'
import { scoreLead } from './leadScoring.js'
import { normalizeAgentOutput } from './schemas.js'
import { requestHumanHandoff } from '../services/handoff.service.js'
import {
  HANDOFF_REASON_CODES,
  HANDOFF_TRIGGERED_BY,
} from '../services/handoff.constants.js'

function normalizeTime(time) {
  if (!time) return time
  return time.length === 5 ? `${time}:00` : time
}

export function createToolExecutor(session) {
  const state = {
    contact: session.contact,
    conversation: session.conversation,
    existingLead: session.existingLead,
    handoffRequested: false,
    appointment: null,
    lead: session.existingLead,
    finalized: null,
    toolTrace: [],
  }

  async function searchKnowledgeBase({ query }) {
    if (db.knowledge.search) {
      return db.knowledge.search(query, 5)
    }

    const listed = await db.knowledge.list({
      page: 1,
      limit: 20,
      from: 0,
      to: 19,
    })
    const q = String(query || '').toLowerCase()
    return (listed.data || [])
      .filter((item) =>
        `${item.title} ${item.content} ${item.category || ''}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 5)
  }

  async function upsertContactDetails(args = {}) {
    const payload = {
      name: args.name || state.contact?.name,
      email: args.email ?? state.contact?.email ?? null,
      phone: args.phone || state.contact?.phone,
      company: args.company ?? state.contact?.company ?? null,
      notes: args.notes ?? state.contact?.notes ?? null,
    }

    if (!payload.phone && !state.contact) {
      return { ok: false, error: 'phone is required to create a contact' }
    }

    if (state.contact?.id) {
      state.contact = await db.contacts.update(state.contact.id, payload)
    } else if (db.contacts.upsertByPhone && payload.phone) {
      state.contact = await db.contacts.upsertByPhone(payload)
      if (state.conversation?.id && state.contact?.id) {
        state.conversation = await db.conversations.update(
          state.conversation.id,
          { contact_id: state.contact.id },
        )
      }
    } else {
      state.contact = await db.contacts.create(payload)
    }

    return { ok: true, contact: state.contact }
  }

  async function createOrUpdateLead(args = {}) {
    if (!state.contact?.id && !state.conversation?.contact_id) {
      return { ok: false, error: 'Contact required before creating a lead' }
    }

    const contactId = state.contact?.id || state.conversation.contact_id
    const leadInformation = {
      name: args.name || state.contact?.name || null,
      email: args.email || state.contact?.email || null,
      phone: args.phone || state.contact?.phone || null,
      company: args.company || state.contact?.company || null,
      service: args.service || null,
      budget: args.budget || null,
      timeline: args.timeline || null,
      notes: args.notes || null,
    }

    const leadScore =
      typeof args.lead_score === 'number'
        ? args.lead_score
        : scoreLead(leadInformation, 'lead_qualification')

    const payload = {
      contact_id: contactId,
      service: leadInformation.service,
      budget: leadInformation.budget,
      timeline: leadInformation.timeline,
      lead_score: leadScore,
      status:
        args.status ||
        (leadScore >= 70 ? 'qualified' : leadScore >= 40 ? 'contacted' : 'new'),
      source: 'ai_agent',
      notes: leadInformation.notes,
    }

    if (state.lead?.id && db.leads.update) {
      state.lead = await db.leads.update(state.lead.id, payload)
    } else if (db.leads.findByContactId) {
      const existing = await db.leads.findByContactId(contactId)
      if (existing) {
        state.lead = await db.leads.update(existing.id, payload)
      } else {
        state.lead = await db.leads.create(payload)
      }
    } else {
      state.lead = await db.leads.create(payload)
    }

    return { ok: true, lead: state.lead }
  }

  async function scheduleAppointment(args = {}) {
    const contactId = state.contact?.id || state.conversation?.contact_id
    if (!contactId) {
      return { ok: false, error: 'Contact required before scheduling' }
    }

    state.appointment = await db.appointments.create({
      contact_id: contactId,
      title: args.title,
      appointment_date: args.appointment_date,
      appointment_time: normalizeTime(args.appointment_time),
      status: 'scheduled',
      notes: args.notes || 'Booked by AI agent',
    })

    return { ok: true, appointment: state.appointment }
  }

  async function requestHumanHandoffTool(args = {}) {
    const reasonCode =
      args.reason_code &&
      Object.values(HANDOFF_REASON_CODES).includes(args.reason_code)
        ? args.reason_code
        : HANDOFF_REASON_CODES.CUSTOMER_REQUEST

    const result = await requestHumanHandoff({
      conversationId: state.conversation.id,
      reason: args.reason,
      reasonCode,
      triggeredBy: HANDOFF_TRIGGERED_BY.AI,
      metadata: { source: 'ai_tool' },
    })

    state.conversation = result.conversation
    state.handoffRequested = true
    state.handoffReasonCode = reasonCode

    return {
      ok: true,
      handoff: true,
      reason: args.reason,
      reason_code: reasonCode,
      mode: result.conversation?.mode,
      conversation: state.conversation,
    }
  }

  function finalizeResponse(args = {}) {
    state.finalized = normalizeAgentOutput({
      ...args,
      requires_human: Boolean(args.requires_human || state.handoffRequested),
    })
    return { ok: true, finalized: true }
  }

  const handlers = {
    search_knowledge_base: searchKnowledgeBase,
    upsert_contact_details: upsertContactDetails,
    create_or_update_lead: createOrUpdateLead,
    schedule_appointment: scheduleAppointment,
    request_human_handoff: requestHumanHandoffTool,
    finalize_response: finalizeResponse,
  }

  async function execute(name, args) {
    const handler = handlers[name]
    if (!handler) {
      aiLogger.warn('Unknown tool requested', { name })
      return { ok: false, error: `Unknown tool: ${name}` }
    }

    try {
      const result = await handler(args || {})
      state.toolTrace.push({ name, ok: true })
      aiLogger.info('Tool executed', { name, ok: true })
      return result
    } catch (error) {
      state.toolTrace.push({ name, ok: false, error: error.message })
      aiLogger.error('Tool failed', { name, error: error.message })
      return { ok: false, error: 'Tool execution failed' }
    }
  }

  return {
    execute,
    getState: () => state,
  }
}
