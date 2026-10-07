import { z } from 'zod'

export const createLeadSchema = z.object({
  contact_id: z.string().uuid(),
  service: z.string().trim().max(200).optional().nullable(),
  budget: z.string().trim().max(120).optional().nullable(),
  timeline: z.string().trim().max(120).optional().nullable(),
  lead_score: z.number().int().min(0).max(100).optional(),
  status: z
    .enum([
      'new',
      'contacted',
      'qualified',
      'proposal',
      'won',
      'lost',
      'nurture',
    ])
    .optional(),
  source: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
})

export const updateLeadSchema = createLeadSchema
  .omit({ contact_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
