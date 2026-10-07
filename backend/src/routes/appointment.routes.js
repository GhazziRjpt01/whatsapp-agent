import { Router } from 'express'
import * as appointmentController from '../controllers/appointment.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../validators/appointment.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(appointmentController.listAppointments),
)

router.post(
  '/',
  authorize('admin', 'manager', 'agent'),
  validate(createAppointmentSchema),
  asyncHandler(appointmentController.createAppointment),
)

router.put(
  '/:id',
  authorize('admin', 'manager', 'agent'),
  validate(uuidParamSchema, 'params'),
  validate(updateAppointmentSchema),
  asyncHandler(appointmentController.updateAppointment),
)

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  asyncHandler(appointmentController.deleteAppointment),
)

export default router
