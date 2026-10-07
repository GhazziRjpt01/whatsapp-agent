import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { aiLogger } from './logger.js'

export async function resolveConversationContext({
  conversationId,
  contactId,
  messageLimit = 20,
}) {
  let conversation = null
  let contact = null

  if (conversationId) {
    conversation = await db.conversations.getById(conversationId)
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found')
    }
    contact =
      conversation.contact ||
      (await db.contacts.getById(conversation.contact_id))
  } else if (contactId) {
    contact = await db.contacts.getById(contactId)
    if (!contact) {
      throw new ApiError(404, 'Contact not found')
    }

    conversation = db.conversations.findOpenByContactId
      ? await db.conversations.findOpenByContactId(contactId)
      : null

    if (!conversation) {
      conversation = await db.conversations.create({
        contact_id: contactId,
        status: 'open',
        mode: 'AI_ACTIVE',
        ai_enabled: true,
      })
    }
  } else {
    throw new ApiError(
      400,
      'conversation_id or contact_id is required to chat with the AI agent',
    )
  }

  const history = await db.messages.listByConversation(conversation.id, {
    page: 1,
    limit: messageLimit,
    from: 0,
    to: messageLimit - 1,
  })

  const existingLead = db.leads.findByContactId
    ? await db.leads.findByContactId(conversation.contact_id)
    : null

  const knowledge = await db.knowledge.list({
    page: 1,
    limit: 8,
    from: 0,
    to: 7,
  })

  aiLogger.info('Context loaded', {
    conversationId: conversation.id,
    contactId: conversation.contact_id,
    historyCount: history.data?.length || 0,
    knowledgeCount: knowledge.data?.length || 0,
  })

  return {
    conversation,
    contact,
    history: history.data || [],
    existingLead,
    knowledgeArticles: knowledge.data || [],
  }
}

export function toChatMessages(history = []) {
  return history.map((item) => {
    if (item.sender_type === 'customer') {
      return { role: 'user', content: item.message }
    }

    return {
      role: 'assistant',
      content: item.message,
    }
  })
}

export function detectLanguageHint(text = '') {
  if (/[\u0600-\u06FF]/.test(text)) return 'urdu'
  if (
    /\b(kya|hai|haan|nahi|mujhe|chahiye|pricing|budget|demo)\b/i.test(text) &&
    /\b(hai|kya|chahiye|mujhe|please|kr|kar)\b/i.test(text)
  ) {
    return 'roman_urdu'
  }
  return 'english'
}
