import { z } from 'zod'

export const updateAiSettingsSchema = z
  .object({
    agent_name: z.string().trim().min(1).max(120).optional(),
    system_prompt: z.string().trim().min(1).max(20000).optional(),
    model: z.string().trim().min(1).max(80).optional(),
    temperature: z.number().min(0).max(2).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export const aiChatSchema = z
  .object({
    message: z.string().trim().min(1).max(10000),
    conversation_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().optional(),
    persist: z.boolean().optional().default(true),
  })
  .refine((value) => value.conversation_id || value.contact_id, {
    message: 'conversation_id or contact_id is required',
    path: ['conversation_id'],
  })
