import { z } from 'zod'

const roleSchema = z.enum(['ceo', 'admin', 'manager', 'agent', 'viewer'])
const statusSchema = z.enum(['online', 'away', 'offline', 'disabled'])

export const createTeamMemberSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
  role: roleSchema.default('agent'),
  status: statusSchema.default('offline'),
})

export const updateTeamMemberSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
