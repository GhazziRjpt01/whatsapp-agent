import { db } from '../db/client.js'
import { waLogger } from './logger.js'

const STATUS_RANK = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

function shouldUpgrade(current, next) {
  if (!next) return false
  if (!current) return true
  if (next === 'failed') return true
  if (current === 'failed') return false
  return (STATUS_RANK[next] || 0) >= (STATUS_RANK[current] || 0)
}

export async function applyWhatsAppStatus(statusEvent) {
  if (!statusEvent?.whatsappMessageId || !statusEvent?.status) {
    return { updated: false, reason: 'invalid_status_event' }
  }

  if (!db.messages?.updateStatusByWhatsAppId) {
    waLogger.warn('Message status updater unavailable on current store')
    return { updated: false, reason: 'store_unsupported' }
  }

  const existing = db.messages.findByWhatsAppId
    ? await db.messages.findByWhatsAppId(statusEvent.whatsappMessageId)
    : null

  if (existing?.delivery_status && !shouldUpgrade(existing.delivery_status, statusEvent.status)) {
    waLogger.info('Ignored stale WhatsApp status', {
      whatsappMessageId: statusEvent.whatsappMessageId,
      current: existing.delivery_status,
      incoming: statusEvent.status,
    })
    return { updated: false, reason: 'stale_status' }
  }

  const updated = await db.messages.updateStatusByWhatsAppId(
    statusEvent.whatsappMessageId,
    {
      delivery_status: statusEvent.status,
      status_updated_at: statusEvent.timestamp || new Date().toISOString(),
    },
  )

  waLogger.info('WhatsApp delivery status updated', {
    whatsappMessageId: statusEvent.whatsappMessageId,
    status: statusEvent.status,
    updated: Boolean(updated),
    recipientId: statusEvent.recipientId,
  })

  return { updated: Boolean(updated), message: updated }
}
