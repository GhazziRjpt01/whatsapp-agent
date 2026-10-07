import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { webhookRateLimiter } from '../middleware/rateLimiter.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from '../whatsapp/webhook.controller.js'
import { sendWhatsAppMessage } from '../whatsapp/send.controller.js'
import {
  connectWhatsAppSession,
  disconnectWhatsAppSession,
  getWhatsAppSession,
} from '../whatsapp/session.controller.js'
import { sendWhatsAppSchema } from '../validators/whatsapp.validator.js'

const router = Router()

router.get(
  '/webhook',
  webhookRateLimiter,
  asyncHandler(verifyWhatsAppWebhook),
)

router.post(
  '/webhook',
  webhookRateLimiter,
  asyncHandler(receiveWhatsAppWebhook),
)

router.get(
  '/session',
  authenticate,
  authorize('admin', 'manager', 'agent'),
  asyncHandler(getWhatsAppSession),
)

router.post(
  '/session/connect',
  authenticate,
  authorize('admin', 'manager', 'agent'),
  asyncHandler(connectWhatsAppSession),
)

router.post(
  '/session/disconnect',
  authenticate,
  authorize('admin', 'manager', 'agent'),
  asyncHandler(disconnectWhatsAppSession),
)

router.post(
  '/send',
  authenticate,
  authorize('admin', 'manager', 'agent'),
  validate(sendWhatsAppSchema),
  asyncHandler(sendWhatsAppMessage),
)

export default router
