import { Router } from 'express'
import * as analyticsController from '../controllers/analytics.controller.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(authenticate)

router.get('/overview', asyncHandler(analyticsController.getOverview))

export default router
