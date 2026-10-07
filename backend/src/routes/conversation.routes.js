import { Router } from 'express'
import * as conversationController from '../controllers/conversation.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createConversationSchema,
  createMessageSchema,
  handoffActionSchema,
  listConversationsQuerySchema,
  updateConversationSchema,
} from '../validators/conversation.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(listConversationsQuerySchema, 'query'),
  asyncHandler(conversationController.listConversations),
)

router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(conversationController.getConversation),
)

router.post(
  '/',
  authorize('admin', 'manager', 'agent'),
  validate(createConversationSchema),
  asyncHandler(conversationController.createConversation),
)

router.put(
  '/:id',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(updateConversationSchema),
  asyncHandler(conversationController.updateConversation),
)

router.post(
  '/:id/takeover',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(handoffActionSchema),
  asyncHandler(conversationController.takeover),
)

router.post(
  '/:id/return-to-ai',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(handoffActionSchema),
  asyncHandler(conversationController.returnToAi),
)

router.get(
  '/:id/handoffs',
  validate(uuidParamSchema, 'params'),
  asyncHandler(conversationController.listHandoffs),
)

router.get(
  '/:id/messages',
  validate(uuidParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  asyncHandler(conversationController.listMessages),
)

router.post(
  '/:id/messages',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(createMessageSchema),
  asyncHandler(conversationController.createMessage),
)

export default router
