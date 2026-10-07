import { Router } from 'express'
import * as teamController from '../controllers/team.controller.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { paginationSchema, uuidParamSchema } from '../validators/common.js'
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
} from '../validators/team.validator.js'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(teamController.listTeamMembers),
)

router.post(
  '/',
  authorize('admin', 'manager'),
  validate(createTeamMemberSchema),
  asyncHandler(teamController.createTeamMember),
)

router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  validate(updateTeamMemberSchema),
  asyncHandler(teamController.updateTeamMember),
)

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  validate(uuidParamSchema, 'params'),
  asyncHandler(teamController.removeTeamMember),
)

export default router
