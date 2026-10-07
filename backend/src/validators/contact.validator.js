import { z } from 'zod'

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
})

export const updateContactSchema = createContactSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
)
