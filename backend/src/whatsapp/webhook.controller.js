import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { processWhatsAppWebhookPayload } from './webhook.service.js'
import { assertSignatureOrThrow } from './signature.js'
import { waLogger } from './logger.js'

export function verifyWhatsAppWebhook(req, res) {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  waLogger.info('Webhook verification attempt', {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  })

  // Prefer live process.env so tests/config reloads are not stuck on import-time values.
  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || env.whatsappVerifyToken

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    waLogger.info('Webhook verification succeeded')
    return res.status(200).send(String(challenge))
  }

  waLogger.warn('Webhook verification failed')
  throw new ApiError(403, 'Webhook verification failed')
}

export async function receiveWhatsAppWebhook(req, res) {
  assertSignatureOrThrow(req)

  const payload = req.body || {}
  const sync =
    process.env.WHATSAPP_WEBHOOK_SYNC === 'true' ||
    req.get('x-webhook-sync') === 'true'

  waLogger.info('Webhook event received', {
    object: payload.object || null,
    entries: Array.isArray(payload.entry) ? payload.entry.length : 0,
    sync,
  })

  if (sync) {
    const result = await processWhatsAppWebhookPayload(payload)
    return res.status(200).json({
      success: true,
      message: 'EVENT_PROCESSED',
      data: {
        processedMessages: result.processedMessages,
        processedStatuses: result.processedStatuses,
        results: result.results,
      },
    })
  }

  // Production default: acknowledge immediately, process asynchronously.
  res.status(200).json({
    success: true,
    message: 'EVENT_RECEIVED',
  })

  setImmediate(() => {
    processWhatsAppWebhookPayload(payload)
      .then((result) => {
        waLogger.info('Webhook processing completed', {
          processedMessages: result.processedMessages,
          processedStatuses: result.processedStatuses,
        })
      })
      .catch((error) => {
        waLogger.error('Webhook processing failed', {
          error: error.message,
        })
      })
  })
}
