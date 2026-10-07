import { processCustomerMessage } from '../ai/agent.service.js'
import { isAiAutoReplyEnabled } from '../services/handoff.constants.js'
import { parseWhatsAppWebhook } from './parser.js'
import {
  getOrCreateWhatsAppConversation,
  storeInboundWhatsAppMessage,
  upsertWhatsAppContact,
} from './inbound.service.js'
import { sendAndStoreWhatsAppMessage } from './outbound.service.js'
import { applyWhatsAppStatus } from './status.service.js'
import { waLogger } from './logger.js'

export async function handleInboundMessage(inboundMessage) {
  const contact = await upsertWhatsAppContact(inboundMessage)
  const conversation = await getOrCreateWhatsAppConversation(contact)
  const { message, duplicate } = await storeInboundWhatsAppMessage(
    conversation,
    inboundMessage,
  )

  if (duplicate) {
    return {
      type: 'message',
      duplicate: true,
      conversationId: conversation.id,
      messageId: message.id,
    }
  }

  // Text-only / media-only stubs: still acknowledge but skip AI if empty meaningful text.
  const text = (inboundMessage.text || '').trim()
  const nonTextPlaceholder = text.startsWith('[') && text.endsWith(']')
  if (!text || nonTextPlaceholder) {
    waLogger.info('Skipping AI for non-text/empty WhatsApp message', {
      conversationId: conversation.id,
      type: inboundMessage.type,
    })
    return {
      type: 'message',
      skippedAi: true,
      conversationId: conversation.id,
      messageId: message.id,
    }
  }

  if (!isAiAutoReplyEnabled(conversation)) {
    waLogger.info('AI auto-reply off; inbound stored for human agent', {
      conversationId: conversation.id,
      mode: conversation.mode,
    })
    return {
      type: 'message',
      aiDisabled: true,
      mode: conversation.mode || null,
      conversationId: conversation.id,
      messageId: message.id,
    }
  }

  let agentResult
  try {
    agentResult = await processCustomerMessage({
      message: text,
      conversationId: conversation.id,
      contactId: contact.id,
      persistInbound: false,
      persistOutbound: false,
    })
  } catch (error) {
    waLogger.error('AI processing failed for WhatsApp message', {
      conversationId: conversation.id,
      error: error.message,
      statusCode: error.statusCode,
    })
    return {
      type: 'message',
      aiError: true,
      conversationId: conversation.id,
      messageId: message.id,
      error: error.message,
    }
  }

  const outbound = await sendAndStoreWhatsAppMessage({
    conversationId: conversation.id,
    to: contact.phone,
    body: agentResult.response,
    senderType: agentResult.requires_human ? 'system' : 'ai',
    isAi: true,
  })

  return {
    type: 'message',
    conversationId: conversation.id,
    contactId: contact.id,
    inboundMessageId: message.id,
    outboundMessageId: outbound.message.id,
    whatsappMessageId: outbound.whatsappMessageId,
    intent: agentResult.intent,
    leadScore: agentResult.lead_score,
    requiresHuman: agentResult.requires_human,
  }
}

export async function processWhatsAppWebhookPayload(payload) {
  const { messages, statuses } = parseWhatsAppWebhook(payload)

  waLogger.info('Webhook payload parsed', {
    inboundMessages: messages.length,
    statusEvents: statuses.length,
  })

  const results = []

  for (const statusEvent of statuses) {
    try {
      const result = await applyWhatsAppStatus(statusEvent)
      results.push({ type: 'status', ...result, whatsappMessageId: statusEvent.whatsappMessageId })
    } catch (error) {
      waLogger.error('Failed to apply WhatsApp status', {
        whatsappMessageId: statusEvent.whatsappMessageId,
        error: error.message,
      })
      results.push({
        type: 'status',
        error: true,
        whatsappMessageId: statusEvent.whatsappMessageId,
      })
    }
  }

  for (const inboundMessage of messages) {
    try {
      const result = await handleInboundMessage(inboundMessage)
      results.push(result)
    } catch (error) {
      waLogger.error('Failed to process inbound WhatsApp message', {
        whatsappMessageId: inboundMessage.whatsappMessageId,
        error: error.message,
      })
      results.push({
        type: 'message',
        error: true,
        whatsappMessageId: inboundMessage.whatsappMessageId,
      })
    }
  }

  return {
    received: true,
    processedMessages: messages.length,
    processedStatuses: statuses.length,
    results,
  }
}
