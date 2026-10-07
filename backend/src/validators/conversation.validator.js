import { z } from 'zod'

const conversationModes = z.enum([
  'AI_ACTIVE',
  'WAITING_FOR_HUMAN',
  'HUMAN_ACTIVE',
  'CLOSED',
])

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  mode: conversationModes.optional(),
})

export const createConversationSchema = z.object({
  contact_id: z.string().uuid(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  mode: conversationModes.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  ai_enabled: z.boolean().optional(),
})

export const updateConversationSchema = z
  .object({
    status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
    mode: conversationModes.optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    ai_enabled: z.boolean().optional(),
    handoff_reason: z.string().trim().max(500).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const createMessageSchema = z.object({
  sender_type: z.enum(['customer', 'agent', 'ai', 'system']),
  message: z.string().trim().min(1).max(10000),
  message_type: z
    .enum(['text', 'image', 'audio', 'video', 'document', 'template'])
    .optional(),
  whatsapp_message_id: z.string().trim().max(255).optional().nullable(),
  is_ai: z.boolean().optional(),
})

export const handoffActionSchema = z.preprocess(
  (value) => value ?? {},
  z.object({
    reason: z.string().trim().min(1).max(500).optional(),
    metadata: z.record(z.any()).optional(),
  }),
)
