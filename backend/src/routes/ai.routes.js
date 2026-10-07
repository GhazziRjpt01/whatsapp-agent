import { Router } from 'express'
import * as aiController from '../controllers/ai.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { aiChatRateLimiter } from '../middleware/rateLimiter.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  aiChatSchema,
  updateAiSettingsSchema,
} from '../validators/ai.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/settings',
  authorize('admin', 'manager', 'agent'),
  asyncHandler(aiController.getAiSettings),
)

router.put(
  '/settings',
  authorize('admin', 'manager'),
  validate(updateAiSettingsSchema),
  asyncHandler(aiController.updateAiSettings),
)

router.post(
  '/chat',
  authorize('admin', 'manager', 'agent'),
  aiChatRateLimiter,
  validate(aiChatSchema),
  asyncHandler(aiController.chatWithAgent),
)

export default router
