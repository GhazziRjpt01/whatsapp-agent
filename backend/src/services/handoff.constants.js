export const CONVERSATION_MODES = {
  AI_ACTIVE: 'AI_ACTIVE',
  WAITING_FOR_HUMAN: 'WAITING_FOR_HUMAN',
  HUMAN_ACTIVE: 'HUMAN_ACTIVE',
  CLOSED: 'CLOSED',
}

export const HANDOFF_REASON_CODES = {
  CUSTOMER_REQUEST: 'customer_request',
  LOW_CONFIDENCE: 'low_confidence',
  COMPLAINT: 'complaint',
  SENSITIVE_INFO: 'sensitive_info',
  HIGH_INTENT: 'high_intent',
  AGENT_TAKEOVER: 'agent_takeover',
  RETURN_TO_AI: 'return_to_ai',
  CLOSED: 'closed',
  REOPENED: 'reopened',
}

export const HANDOFF_TRIGGERED_BY = {
  AI: 'ai',
  AGENT: 'agent',
  SYSTEM: 'system',
}

export const REASON_LABELS = {
  customer_request: 'Customer requested a human agent',
  low_confidence: 'AI could not answer confidently',
  complaint: 'Customer complaint detected',
  sensitive_info: 'Sensitive business information requested',
  high_intent: 'High purchase-intent lead',
  agent_takeover: 'Agent took over the conversation',
  return_to_ai: 'Returned conversation to AI',
  closed: 'Conversation closed',
  reopened: 'Conversation reopened',
}

export function modeFlags(mode) {
  switch (mode) {
    case CONVERSATION_MODES.AI_ACTIVE:
      return { ai_enabled: true, status: 'open' }
    case CONVERSATION_MODES.WAITING_FOR_HUMAN:
      return { ai_enabled: false, status: 'pending' }
    case CONVERSATION_MODES.HUMAN_ACTIVE:
      return { ai_enabled: false, status: 'pending' }
    case CONVERSATION_MODES.CLOSED:
      return { ai_enabled: false, status: 'closed' }
    default:
      return { ai_enabled: true, status: 'open' }
  }
}

export function resolveMode(conversation = {}) {
  if (conversation.mode) return conversation.mode
  if (conversation.status === 'closed' || conversation.status === 'resolved') {
    return CONVERSATION_MODES.CLOSED
  }
  if (conversation.ai_enabled === false) {
    return conversation.assigned_to
      ? CONVERSATION_MODES.HUMAN_ACTIVE
      : CONVERSATION_MODES.WAITING_FOR_HUMAN
  }
  return CONVERSATION_MODES.AI_ACTIVE
}

export function isAiAutoReplyEnabled(conversation = {}) {
  const mode = resolveMode(conversation)
  return mode === CONVERSATION_MODES.AI_ACTIVE && conversation.ai_enabled !== false
}
