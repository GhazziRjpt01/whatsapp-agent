import { Router } from 'express'
import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from '../whatsapp/webhook.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { webhookRateLimiter } from '../middleware/rateLimiter.js'

// Legacy routes kept for existing Meta callback configs:
// GET/POST /api/webhooks/whatsapp
const router = Router()

router.get('/whatsapp', webhookRateLimiter, asyncHandler(verifyWhatsAppWebhook))
router.post(
  '/whatsapp',
  webhookRateLimiter,
  asyncHandler(receiveWhatsAppWebhook),
)

export default router
