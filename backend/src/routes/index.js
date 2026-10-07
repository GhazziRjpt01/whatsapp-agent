import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import webhookRoutes from './webhook.routes.js'
import whatsappRoutes from './whatsapp.routes.js'
import contactRoutes from './contact.routes.js'
import conversationRoutes from './conversation.routes.js'
import leadRoutes from './lead.routes.js'
import appointmentRoutes from './appointment.routes.js'
import knowledgeRoutes from './knowledge.routes.js'
import aiRoutes from './ai.routes.js'
import analyticsRoutes from './analytics.routes.js'
import teamRoutes from './team.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
// Legacy alias (still supported)
router.use('/webhooks', webhookRoutes)
// Canonical WhatsApp Cloud API routes
router.use('/whatsapp', whatsappRoutes)
router.use('/contacts', contactRoutes)
router.use('/conversations', conversationRoutes)
router.use('/leads', leadRoutes)
router.use('/appointments', appointmentRoutes)
router.use('/knowledge', knowledgeRoutes)
router.use('/ai', aiRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/team', teamRoutes)

export default router
