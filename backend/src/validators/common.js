import { z } from 'zod'

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  category: z.string().trim().optional(),
})
