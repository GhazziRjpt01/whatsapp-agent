import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import {
  extractWhatsAppMessageId,
  sendWhatsAppTextMessage,
} from './whatsapp.client.js'
import { normalizeWhatsAppPhone } from './phone.js'
import { waLogger } from './logger.js'

export async function sendAndStoreWhatsAppMessage({
  conversationId,
  to,
  body,
  senderType = 'ai',
  isAi = true,
}) {
  const phone = normalizeWhatsAppPhone(to)
  if (!phone) {
    throw new ApiError(400, 'Valid recipient phone is required')
  }

  const conversation = await db.conversations.getById(conversationId)
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found')
  }

  const apiResponse = await sendWhatsAppTextMessage(phone, body)
  const whatsappMessageId = extractWhatsAppMessageId(apiResponse)

  const stored = await db.messages.create(conversationId, {
    sender_type: senderType,
    message: body,
    message_type: 'text',
    whatsapp_message_id: whatsappMessageId,
    is_ai: isAi,
    delivery_status: 'sent',
    status_updated_at: new Date().toISOString(),
  })

  await db.conversations.update(conversationId, {
    last_message_at: stored.created_at,
  })

  waLogger.info('Outbound WhatsApp message stored', {
    conversationId,
    messageId: stored.id,
    whatsappMessageId,
    senderType,
    mock: Boolean(apiResponse?.mock),
  })

  return {
    message: stored,
    whatsappMessageId,
    apiResponse,
  }
}
