import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import {
  CONVERSATION_MODES,
  HANDOFF_REASON_CODES,
  HANDOFF_TRIGGERED_BY,
  REASON_LABELS,
  modeFlags,
  resolveMode,
} from './handoff.constants.js'

async function getConversationOrThrow(id) {
  const conversation = await db.conversations.getById(id)
  if (!conversation) throw new ApiError(404, 'Conversation not found')
  return conversation
}

async function writeAudit({
  conversationId,
  fromMode,
  toMode,
  reason,
  reasonCode,
  triggeredBy,
  actorId = null,
  metadata = {},
}) {
  const row = {
    conversation_id: conversationId,
    from_mode: fromMode,
    to_mode: toMode,
    reason: reason || REASON_LABELS[reasonCode] || reasonCode,
    reason_code: reasonCode,
    triggered_by: triggeredBy,
    actor_id: actorId,
    metadata,
  }

  if (db.handoffs?.create) {
    return db.handoffs.create(row)
  }

  // Fallback: persist a system message so audit still exists without the table helper.
  await db.messages.create(conversationId, {
    sender_type: 'system',
    message: `Handoff: ${fromMode || 'unknown'} → ${toMode} (${reasonCode}) — ${row.reason}`,
    message_type: 'text',
    is_ai: false,
  })
  return row
}

async function applyModeTransition({
  conversation,
  toMode,
  reason,
  reasonCode,
  triggeredBy,
  actorId = null,
  assignedTo,
  metadata = {},
  systemMessage,
}) {
  const fromMode = resolveMode(conversation)
  if (fromMode === toMode && assignedTo === undefined) {
    return {
      conversation,
      handoff: null,
      unchanged: true,
    }
  }

  const flags = modeFlags(toMode)
  const patch = {
    mode: toMode,
    ...flags,
    handoff_reason: reason || REASON_LABELS[reasonCode] || null,
  }

  if (toMode === CONVERSATION_MODES.WAITING_FOR_HUMAN) {
    patch.handoff_requested_at = new Date().toISOString()
  }

  if (assignedTo !== undefined) {
    patch.assigned_to = assignedTo
  }

  if (toMode === CONVERSATION_MODES.AI_ACTIVE) {
    patch.handoff_reason = null
    patch.handoff_requested_at = null
    if (assignedTo === undefined) patch.assigned_to = null
  }

  const updated = await db.conversations.update(conversation.id, patch)
  const handoff = await writeAudit({
    conversationId: conversation.id,
    fromMode,
    toMode,
    reason: reason || REASON_LABELS[reasonCode],
    reasonCode,
    triggeredBy,
    actorId,
    metadata: {
      ...metadata,
      assigned_to: updated?.assigned_to ?? null,
    },
  })

  if (systemMessage !== false) {
    const note =
      typeof systemMessage === 'string'
        ? systemMessage
        : `Conversation mode changed to ${toMode}: ${reason || REASON_LABELS[reasonCode] || reasonCode}`
    await db.messages.create(conversation.id, {
      sender_type: 'system',
      message: note,
      message_type: 'text',
      is_ai: false,
    })
  }

  return { conversation: updated, handoff, unchanged: false }
}

/** AI / system requests a human — AI stops auto-replying. */
export async function requestHumanHandoff({
  conversationId,
  reason,
  reasonCode = HANDOFF_REASON_CODES.CUSTOMER_REQUEST,
  triggeredBy = HANDOFF_TRIGGERED_BY.AI,
  actorId = null,
  metadata = {},
}) {
  const conversation = await getConversationOrThrow(conversationId)
  const current = resolveMode(conversation)

  if (
    current === CONVERSATION_MODES.WAITING_FOR_HUMAN ||
    current === CONVERSATION_MODES.HUMAN_ACTIVE
  ) {
    return { conversation, handoff: null, unchanged: true }
  }

  if (current === CONVERSATION_MODES.CLOSED) {
    throw new ApiError(409, 'Cannot hand off a closed conversation')
  }

  return applyModeTransition({
    conversation,
    toMode: CONVERSATION_MODES.WAITING_FOR_HUMAN,
    reason,
    reasonCode,
    triggeredBy,
    actorId,
    metadata,
    systemMessage: `Human handoff requested: ${reason || REASON_LABELS[reasonCode]}`,
  })
}

/** Agent takes ownership — AI stays off. */
export async function takeOverConversation({
  conversationId,
  actor,
  reason,
  metadata = {},
}) {
  if (!actor?.id) throw new ApiError(401, 'Authentication required')
  const conversation = await getConversationOrThrow(conversationId)
  const current = resolveMode(conversation)

  if (current === CONVERSATION_MODES.CLOSED) {
    throw new ApiError(409, 'Cannot take over a closed conversation')
  }

  if (
    current === CONVERSATION_MODES.HUMAN_ACTIVE &&
    conversation.assigned_to === actor.id
  ) {
    return { conversation, handoff: null, unchanged: true }
  }

  return applyModeTransition({
    conversation,
    toMode: CONVERSATION_MODES.HUMAN_ACTIVE,
    reason: reason || REASON_LABELS.agent_takeover,
    reasonCode: HANDOFF_REASON_CODES.AGENT_TAKEOVER,
    triggeredBy: HANDOFF_TRIGGERED_BY.AGENT,
    actorId: actor.id,
    assignedTo: actor.id,
    metadata: {
      ...metadata,
      actor_name: actor.full_name || actor.name || actor.email,
    },
    systemMessage: `${actor.full_name || actor.email || 'Agent'} took over this conversation.`,
  })
}

/** Return control to AI auto-replies. */
export async function returnToAi({
  conversationId,
  actor,
  reason,
  metadata = {},
}) {
  if (!actor?.id) throw new ApiError(401, 'Authentication required')
  const conversation = await getConversationOrThrow(conversationId)
  const current = resolveMode(conversation)

  if (current === CONVERSATION_MODES.AI_ACTIVE) {
    return { conversation, handoff: null, unchanged: true }
  }

  if (current === CONVERSATION_MODES.CLOSED) {
    throw new ApiError(409, 'Reopen the conversation before returning it to AI')
  }

  return applyModeTransition({
    conversation,
    toMode: CONVERSATION_MODES.AI_ACTIVE,
    reason: reason || REASON_LABELS.return_to_ai,
    reasonCode: HANDOFF_REASON_CODES.RETURN_TO_AI,
    triggeredBy: HANDOFF_TRIGGERED_BY.AGENT,
    actorId: actor.id,
    assignedTo: null,
    metadata: {
      ...metadata,
      actor_name: actor.full_name || actor.name || actor.email,
    },
    systemMessage: `${actor.full_name || actor.email || 'Agent'} returned this conversation to AI.`,
  })
}

export async function closeConversation({
  conversationId,
  actor,
  reason,
  metadata = {},
}) {
  const conversation = await getConversationOrThrow(conversationId)
  return applyModeTransition({
    conversation,
    toMode: CONVERSATION_MODES.CLOSED,
    reason: reason || REASON_LABELS.closed,
    reasonCode: HANDOFF_REASON_CODES.CLOSED,
    triggeredBy: actor?.id
      ? HANDOFF_TRIGGERED_BY.AGENT
      : HANDOFF_TRIGGERED_BY.SYSTEM,
    actorId: actor?.id || null,
    metadata,
    systemMessage: 'Conversation closed.',
  })
}

export async function listHandoffs(conversationId) {
  await getConversationOrThrow(conversationId)
  if (!db.handoffs?.listByConversation) return []
  return db.handoffs.listByConversation(conversationId)
}

export function enrichConversation(conversation) {
  if (!conversation) return conversation
  const mode = resolveMode(conversation)
  return {
    ...conversation,
    mode,
    handoff_reason: conversation.handoff_reason || null,
  }
}
