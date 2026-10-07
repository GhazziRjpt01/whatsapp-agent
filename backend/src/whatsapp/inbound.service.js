import { db } from '../db/client.js'
import { waLogger } from './logger.js'
import { normalizeWhatsAppPhone } from './phone.js'

export async function upsertWhatsAppContact(inboundMessage) {
  const phone = normalizeWhatsAppPhone(inboundMessage.from)
  if (!phone) {
    throw new Error('Incoming WhatsApp message missing sender phone')
  }

  const payload = {
    phone,
    name: inboundMessage.contactName || phone,
    notes: 'Created/updated from WhatsApp webhook',
  }

  let contact
  if (db.contacts.upsertByPhone) {
    contact = await db.contacts.upsertByPhone(payload)
  } else {
    const existing = await db.contacts.list({
      page: 1,
      limit: 100,
      from: 0,
      to: 99,
      search: phone,
    })
    const match = (existing.data || []).find((item) => item.phone === phone)
    contact = match
      ? await db.contacts.update(match.id, payload)
      : await db.contacts.create(payload)
  }

  // Prefer profile name when we previously stored phone as name.
  if (
    inboundMessage.contactName &&
    contact.name === phone &&
    contact.name !== inboundMessage.contactName
  ) {
    contact = await db.contacts.update(contact.id, {
      name: inboundMessage.contactName,
    })
  }

  waLogger.info('Contact upserted from WhatsApp', {
    contactId: contact.id,
    phone: contact.phone,
  })

  return contact
}

export async function getOrCreateWhatsAppConversation(contact) {
  let conversation = db.conversations.findOpenByContactId
    ? await db.conversations.findOpenByContactId(contact.id)
    : null

  // If human-handoff conversation exists, keep using it (AI disabled).
  if (!conversation && db.conversations.list) {
    const listed = await db.conversations.list({
      page: 1,
      limit: 50,
      from: 0,
      to: 49,
    })
    conversation =
      (listed.data || []).find(
        (item) =>
          item.contact_id === contact.id &&
          item.mode !== 'CLOSED' &&
          ['open', 'pending'].includes(item.status),
      ) || null
  }

  if (!conversation) {
    conversation = await db.conversations.create({
      contact_id: contact.id,
      status: 'open',
      mode: 'AI_ACTIVE',
      ai_enabled: true,
    })
    waLogger.info('Conversation created from WhatsApp', {
      conversationId: conversation.id,
      contactId: contact.id,
    })
  } else {
    waLogger.info('Conversation reused for WhatsApp', {
      conversationId: conversation.id,
      contactId: contact.id,
      mode: conversation.mode,
      aiEnabled: conversation.ai_enabled,
    })
  }

  return conversation
}

export async function storeInboundWhatsAppMessage(conversation, inboundMessage) {
  if (inboundMessage.whatsappMessageId && db.messages.findByWhatsAppId) {
    const existing = await db.messages.findByWhatsAppId(
      inboundMessage.whatsappMessageId,
    )
    if (existing) {
      waLogger.info('Duplicate inbound WhatsApp message ignored', {
        whatsappMessageId: inboundMessage.whatsappMessageId,
        messageId: existing.id,
      })
      return { message: existing, duplicate: true }
    }
  }

  const message = await db.messages.create(conversation.id, {
    sender_type: 'customer',
    message: inboundMessage.text || '[empty message]',
    message_type: inboundMessage.type || 'text',
    whatsapp_message_id: inboundMessage.whatsappMessageId || null,
    is_ai: false,
    delivery_status: 'received',
    status_updated_at: inboundMessage.timestamp || new Date().toISOString(),
  })

  await db.conversations.update(conversation.id, {
    last_message_at: message.created_at,
    status: conversation.status === 'closed' ? 'open' : conversation.status,
  })

  waLogger.info('Inbound WhatsApp message stored', {
    conversationId: conversation.id,
    messageId: message.id,
    whatsappMessageId: inboundMessage.whatsappMessageId,
    type: inboundMessage.type,
  })

  return { message, duplicate: false }
}
