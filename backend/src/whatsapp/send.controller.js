import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { sendSuccess } from '../utils/ApiResponse.js'
import { sendAndStoreWhatsAppMessage } from './outbound.service.js'

export async function sendWhatsAppMessage(req, res) {
  const { to, message, conversation_id: conversationId, contact_id: contactId } =
    req.body

  let targetConversationId = conversationId
  let recipient = to

  if (!targetConversationId && contactId) {
    const open = db.conversations.findOpenByContactId
      ? await db.conversations.findOpenByContactId(contactId)
      : null
    const conversation =
      open ||
      (await db.conversations.create({
        contact_id: contactId,
        status: 'open',
        ai_enabled: false,
      }))
    targetConversationId = conversation.id
    recipient = recipient || conversation.contact?.phone
  }

  if (!targetConversationId) {
    throw new ApiError(400, 'conversation_id or contact_id is required')
  }

  if (!recipient) {
    const conversation = await db.conversations.getById(targetConversationId)
    recipient = conversation?.contact?.phone
  }

  if (!recipient) {
    throw new ApiError(400, 'Recipient phone (to) could not be resolved')
  }

  const result = await sendAndStoreWhatsAppMessage({
    conversationId: targetConversationId,
    to: recipient,
    body: message,
    senderType: 'agent',
    isAi: false,
  })

  return sendSuccess(res, {
    statusCode: 201,
    message: 'WhatsApp message sent successfully',
    data: {
      message: result.message,
      whatsapp_message_id: result.whatsappMessageId,
      mock: Boolean(result.apiResponse?.mock),
    },
  })
}
