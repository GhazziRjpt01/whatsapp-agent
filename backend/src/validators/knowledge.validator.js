import { z } from 'zod'

export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(50000),
  category: z.string().trim().max(100).optional().nullable(),
  file_url: z.string().url().optional().nullable(),
})

export const updateKnowledgeSchema = createKnowledgeSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' },
)
