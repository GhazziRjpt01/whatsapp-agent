import { Router } from 'express'
import { login } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/ApiResponse.js'
import { loginSchema } from '../validators/auth.validator.js'

const router = Router()

router.post('/login', validate(loginSchema), asyncHandler(login))

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    return sendSuccess(res, {
      message: 'Authenticated',
      data: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        avatar_url: req.user.avatar_url || null,
      },
    })
  }),
)

export default router
