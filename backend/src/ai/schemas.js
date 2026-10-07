import { z } from 'zod'

export const INTENT_VALUES = [
  'greeting',
  'service_inquiry',
  'pricing',
  'lead_qualification',
  'appointment_request',
  'support',
  'complaint',
  'human_handoff',
  'other',
]

export const leadInformationSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const agentOutputSchema = z.object({
  response: z.string().min(1),
  intent: z.enum(INTENT_VALUES),
  lead_information: leadInformationSchema.default({}),
  lead_score: z.number().min(0).max(100),
  requires_human: z.boolean(),
  suggested_service: z.string().nullable(),
})

export function normalizeAgentOutput(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  const result = agentOutputSchema.safeParse(parsed)

  if (!result.success) {
    return {
      response:
        parsed?.response ||
        'Thanks for your message. A specialist will follow up shortly.',
      intent: INTENT_VALUES.includes(parsed?.intent) ? parsed.intent : 'other',
      lead_information: parsed?.lead_information || {},
      lead_score: Number.isFinite(parsed?.lead_score)
        ? Math.max(0, Math.min(100, Number(parsed.lead_score)))
        : 0,
      requires_human: Boolean(parsed?.requires_human),
      suggested_service: parsed?.suggested_service || null,
    }
  }

  return result.data
}

export function createEmptyAgentOutput(response, extras = {}) {
  return normalizeAgentOutput({
    response,
    intent: extras.intent || 'other',
    lead_information: extras.lead_information || {},
    lead_score: extras.lead_score || 0,
    requires_human: Boolean(extras.requires_human),
    suggested_service: extras.suggested_service || null,
  })
}
