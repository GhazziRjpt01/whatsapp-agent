import { normalizeWhatsAppPhone } from './phone.js'

function mapMessageType(type) {
  const allowed = ['text', 'image', 'audio', 'video', 'document', 'template']
  return allowed.includes(type) ? type : 'text'
}

function extractMessageBody(message) {
  if (!message) return ''

  switch (message.type) {
    case 'text':
      return message.text?.body || ''
    case 'image':
      return message.image?.caption || '[image]'
    case 'audio':
      return '[audio]'
    case 'video':
      return message.video?.caption || '[video]'
    case 'document':
      return message.document?.filename || message.document?.caption || '[document]'
    case 'button':
      return message.button?.text || '[button]'
    case 'interactive':
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        '[interactive]'
      )
    case 'location':
      return `[location ${message.location?.latitude},${message.location?.longitude}]`
    default:
      return `[${message.type || 'unsupported'} message]`
  }
}

/**
 * Parse Meta WhatsApp Cloud API webhook payload into normalized events.
 */
export function parseWhatsAppWebhook(payload) {
  const messages = []
  const statuses = []

  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []

    for (const change of changes) {
      if (change?.field && change.field !== 'messages') continue

      const value = change?.value || {}
      const metadata = value.metadata || {}
      const contacts = Array.isArray(value.contacts) ? value.contacts : []

      for (const message of value.messages || []) {
        const contact = contacts.find((item) => item.wa_id === message.from)
        messages.push({
          kind: 'message',
          whatsappMessageId: message.id,
          from: normalizeWhatsAppPhone(message.from),
          timestamp: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          type: mapMessageType(message.type),
          text: extractMessageBody(message),
          rawType: message.type,
          contactName: contact?.profile?.name || null,
          phoneNumberId: metadata.phone_number_id || null,
          displayPhoneNumber: metadata.display_phone_number || null,
        })
      }

      for (const status of value.statuses || []) {
        statuses.push({
          kind: 'status',
          whatsappMessageId: status.id,
          status: status.status,
          timestamp: status.timestamp
            ? new Date(Number(status.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          recipientId: normalizeWhatsAppPhone(status.recipient_id),
          conversation: status.conversation || null,
          errors: status.errors || null,
        })
      }
    }
  }

  return { messages, statuses }
}
