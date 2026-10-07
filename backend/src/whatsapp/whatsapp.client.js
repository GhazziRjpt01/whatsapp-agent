import { randomUUID } from 'crypto'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { normalizeWhatsAppPhone } from './phone.js'
import { waLogger } from './logger.js'

export function isWhatsAppConfigured() {
  return Boolean(
    env.whatsappAccessToken &&
      env.whatsappPhoneNumberId &&
      !env.whatsappAccessToken.includes('your_whatsapp') &&
      !env.whatsappPhoneNumberId.includes('your_whatsapp'),
  )
}

export function shouldMockWhatsApp() {
  if (process.env.WHATSAPP_MOCK === 'true') return true
  if (process.env.WHATSAPP_MOCK === 'false') return false
  return !isWhatsAppConfigured() && env.nodeEnv !== 'production'
}

export async function sendWhatsAppTextMessage(to, body) {
  const phone = normalizeWhatsAppPhone(to)
  if (!phone) {
    throw new ApiError(400, 'A valid WhatsApp recipient phone number is required')
  }

  if (!body || !String(body).trim()) {
    throw new ApiError(400, 'Message body is required')
  }

  const qr = await import('./qrSession.js')
  if (qr.isQrSessionConnected()) {
    return qr.sendViaQrSession(phone, body)
  }

  if (shouldMockWhatsApp()) {
    const mockId = `wamid.mock.${randomUUID()}`
    waLogger.info('Mock WhatsApp message sent', {
      to: phone,
      whatsappMessageId: mockId,
      bodyPreview: String(body).slice(0, 120),
    })
    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: phone, wa_id: phone.replace('+', '') }],
      messages: [{ id: mockId }],
      mock: true,
    }
  }

  throw new ApiError(
    409,
    'WhatsApp is not linked. Open Settings and scan the QR code.',
  )
}

export function extractWhatsAppMessageId(apiResponse) {
  return apiResponse?.messages?.[0]?.id || null
}
