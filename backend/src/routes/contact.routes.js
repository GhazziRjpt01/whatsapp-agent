import { Router } from 'express'
import * as contactController from '../controllers/contact.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createContactSchema,
  updateContactSchema,
} from '../validators/contact.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(contactController.listContacts),
)

router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  asyncHandler(contactController.getContact),
)

router.post(
  '/',
  authorize('admin', 'manager', 'agent'),
  validate(createContactSchema),
  asyncHandler(contactController.createContact),
)

router.put(
  '/:id',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(updateContactSchema),
  asyncHandler(contactController.updateContact),
)

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  asyncHandler(contactController.deleteContact),
)

export default router
