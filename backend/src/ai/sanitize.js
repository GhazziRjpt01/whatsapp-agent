const FORBIDDEN =
  /(system prompt|api[_-]?key|sk-[a-z0-9]{10,}|service[_-]?role|supabase_service|bearer\s+[a-z0-9._-]+|openai\.com\/v1|internal configuration)/gi

export function sanitizeCustomerResponse(text = '') {
  return String(text)
    .replace(FORBIDDEN, '[redacted]')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizeAgentOutput(output) {
  return {
    ...output,
    response: sanitizeCustomerResponse(output.response),
    lead_information: output.lead_information || {},
    suggested_service: output.suggested_service || null,
  }
}

export function toPublicAgentResult(result) {
  return {
    response: result.output.response,
    intent: result.output.intent,
    lead_information: result.output.lead_information,
    lead_score: result.output.lead_score,
    requires_human: result.output.requires_human,
    suggested_service: result.output.suggested_service,
    meta: {
      provider: result.provider,
      model: result.model,
      conversation_id: result.conversationId,
      contact_id: result.contactId,
      lead_id: result.leadId || null,
      appointment_id: result.appointmentId || null,
      mode: result.mode || null,
      handoff_reason: result.handoffReason || null,
      tools_used: (result.toolTrace || []).map((item) => item.name),
    },
  }
}
