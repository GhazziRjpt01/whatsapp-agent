import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'
import { sendAndStoreWhatsAppMessage } from '../whatsapp/outbound.service.js'
import {
  enrichConversation,
  listHandoffs as listHandoffAudit,
  returnToAi,
  takeOverConversation,
} from './handoff.service.js'
import {
  CONVERSATION_MODES,
  resolveMode,
} from './handoff.constants.js'

export async function listConversations(query) {
  const pagination = getPagination(query)
  const result = await db.conversations.list({
    ...pagination,
    status: query.status,
    mode: query.mode,
  })

  return {
    data: (result.data || []).map(enrichConversation),
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function getConversationById(id) {
  const conversation = await db.conversations.getById(id)
  if (!conversation) throw new ApiError(404, 'Conversation not found')
  return enrichConversation(conversation)
}

export async function createConversation(payload) {
  const conversation = await db.conversations.create({
    mode: CONVERSATION_MODES.AI_ACTIVE,
    ai_enabled: true,
    ...payload,
  })
  return enrichConversation(conversation)
}

export async function updateConversation(id, payload) {
  const conversation = await db.conversations.update(id, payload)
  if (!conversation) throw new ApiError(404, 'Conversation not found')
  return enrichConversation(conversation)
}

export async function listMessages(conversationId, query) {
  await getConversationById(conversationId)
  const pagination = getPagination(query)
  const result = await db.messages.listByConversation(conversationId, pagination)

  return {
    data: result.data,
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function createMessage(conversationId, payload, actor = null) {
  const conversation = await getConversationById(conversationId)

  // Human agent replies always go out over WhatsApp and keep AI off.
  if (payload.sender_type === 'agent') {
    const mode = resolveMode(conversation)
    if (
      mode === CONVERSATION_MODES.AI_ACTIVE ||
      mode === CONVERSATION_MODES.WAITING_FOR_HUMAN
    ) {
      await takeOverConversation({
        conversationId,
        actor: actor || { id: conversation.assigned_to },
        reason: 'Agent replied to the customer',
        metadata: { source: 'agent_message' },
      })
    }

    const phone = conversation.contact?.phone
    if (!phone) {
      throw new ApiError(400, 'Conversation contact has no phone number')
    }

    const outbound = await sendAndStoreWhatsAppMessage({
      conversationId,
      to: phone,
      body: payload.message,
      senderType: 'agent',
      isAi: false,
    })

    return outbound.message
  }

  return db.messages.create(conversationId, payload)
}

export async function takeover(conversationId, actor, body = {}) {
  const result = await takeOverConversation({
    conversationId,
    actor,
    reason: body.reason,
    metadata: body.metadata || {},
  })
  return {
    conversation: enrichConversation(result.conversation),
    handoff: result.handoff,
    unchanged: result.unchanged,
  }
}

export async function returnConversationToAi(conversationId, actor, body = {}) {
  const result = await returnToAi({
    conversationId,
    actor,
    reason: body.reason,
    metadata: body.metadata || {},
  })
  return {
    conversation: enrichConversation(result.conversation),
    handoff: result.handoff,
    unchanged: result.unchanged,
  }
}

export async function listHandoffs(conversationId) {
  return listHandoffAudit(conversationId)
}
