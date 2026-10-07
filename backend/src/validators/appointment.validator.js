import { z } from 'zod'

export const createAppointmentSchema = z.object({
  contact_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  appointment_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM or HH:MM:SS'),
  status: z
    .enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
})

export const updateAppointmentSchema = createAppointmentSchema
  .omit({ contact_id: true })
  .partial()
  .extend({
    contact_id: z.string().uuid().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
