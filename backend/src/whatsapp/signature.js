import crypto from 'crypto'
import { ApiError } from '../utils/ApiError.js'
import { waLogger } from './logger.js'

export function verifyWhatsAppSignature(rawBody, signatureHeader) {
  const appSecret = process.env.WHATSAPP_APP_SECRET || ''

  // Optional in development; enforced when secret is configured.
  if (!appSecret || appSecret.includes('your_whatsapp')) {
    return true
  }

  if (!signatureHeader || !rawBody) {
    waLogger.warn('Missing WhatsApp signature header or raw body')
    return false
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

  const left = Buffer.from(expected)
  const right = Buffer.from(String(signatureHeader))

  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function shouldEnforceWhatsAppSignature() {
  const secret = process.env.WHATSAPP_APP_SECRET || ''
  return Boolean(secret && !secret.includes('your_whatsapp'))
}

export function assertSignatureOrThrow(req) {
  if (!shouldEnforceWhatsAppSignature()) return

  const valid = verifyWhatsAppSignature(
    req.rawBody,
    req.get('x-hub-signature-256'),
  )

  if (!valid) {
    throw new ApiError(401, 'Invalid WhatsApp webhook signature')
  }
}
