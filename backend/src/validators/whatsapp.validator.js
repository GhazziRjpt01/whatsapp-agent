import { z } from 'zod'

export const sendWhatsAppSchema = z
  .object({
    message: z.string().trim().min(1).max(4096),
    to: z.string().trim().min(5).max(30).optional(),
    conversation_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().optional(),
  })
  .refine((value) => value.conversation_id || value.contact_id || value.to, {
    message: 'Provide conversation_id, contact_id, or to',
    path: ['conversation_id'],
  })
