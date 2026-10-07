import { Router } from 'express'
import * as knowledgeController from '../controllers/knowledge.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createKnowledgeSchema,
  updateKnowledgeSchema,
} from '../validators/knowledge.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(knowledgeController.listKnowledge),
)

router.post(
  '/',
  authorize('admin', 'manager', 'agent'),
  validate(createKnowledgeSchema),
  asyncHandler(knowledgeController.createKnowledge),
)

router.put(
  '/:id',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(updateKnowledgeSchema),
  asyncHandler(knowledgeController.updateKnowledge),
)

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  asyncHandler(knowledgeController.deleteKnowledge),
)

export default router
