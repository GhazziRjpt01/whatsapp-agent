import { Router } from 'express'
import * as leadController from '../controllers/lead.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createLeadSchema,
  updateLeadSchema,
} from '../validators/lead.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(leadController.listLeads),
)

router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(leadController.getLead),
)

router.post(
  '/',
  authorize('admin', 'manager', 'agent'),
  validate(createLeadSchema),
  asyncHandler(leadController.createLead),
)

router.put(
  '/:id',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(updateLeadSchema),
  asyncHandler(leadController.updateLead),
)

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  asyncHandler(leadController.deleteLead),
)

export default router
