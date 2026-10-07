export const CONVERSATION_MODES = {
  AI_ACTIVE: 'AI_ACTIVE',
  WAITING_FOR_HUMAN: 'WAITING_FOR_HUMAN',
  HUMAN_ACTIVE: 'HUMAN_ACTIVE',
  CLOSED: 'CLOSED',
}

export function resolveConversationMode(conversation = {}) {
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

export function modeLabel(mode) {
  switch (mode) {
    case CONVERSATION_MODES.AI_ACTIVE:
      return 'AI Active'
    case CONVERSATION_MODES.WAITING_FOR_HUMAN:
      return 'Waiting for Human'
    case CONVERSATION_MODES.HUMAN_ACTIVE:
      return 'Human Active'
    case CONVERSATION_MODES.CLOSED:
      return 'Closed'
    default:
      return mode || 'Unknown'
  }
}

export function modeBadgeVariant(mode) {
  switch (mode) {
    case CONVERSATION_MODES.AI_ACTIVE:
      return 'success'
    case CONVERSATION_MODES.WAITING_FOR_HUMAN:
      return 'warning'
    case CONVERSATION_MODES.HUMAN_ACTIVE:
      return 'info'
    case CONVERSATION_MODES.CLOSED:
      return 'secondary'
    default:
      return 'outline'
  }
}

export function assigneeName(conversation) {
  return (
    conversation?.assignee?.full_name ||
    conversation?.assignee?.email ||
    (conversation?.assigned_to ? 'Assigned agent' : 'Unassigned')
  )
}
