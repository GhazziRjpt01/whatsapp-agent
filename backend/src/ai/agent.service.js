import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { getAiSettings } from '../services/aiSettings.service.js'
import {
  detectLanguageHint,
  resolveConversationContext,
} from './context.builder.js'
import { detectHandoffNeed } from './handoffDetect.js'
import { aiLogger } from './logger.js'
import { isOpenAIConfigured } from './openai.client.js'
import { runMockAgent } from './providers/mock.provider.js'
import { runOpenAIAgent } from './providers/openai.provider.js'
import { sanitizeAgentOutput, toPublicAgentResult } from './sanitize.js'
import { requestHumanHandoff } from '../services/handoff.service.js'
import {
  HANDOFF_TRIGGERED_BY,
  isAiAutoReplyEnabled,
} from '../services/handoff.constants.js'

function resolveProvider() {
  const configured = (process.env.AI_PROVIDER || 'auto').toLowerCase()

  if (configured === 'mock') return 'mock'
  if (configured === 'openai') {
    if (!isOpenAIConfigured()) {
      throw new ApiError(
        500,
        'AI_PROVIDER=openai but OPENAI_API_KEY is not configured',
      )
    }
    return 'openai'
  }

  return isOpenAIConfigured() ? 'openai' : 'mock'
}

export async function processCustomerMessage({
  message,
  conversationId,
  contactId,
  persist = true,
  persistInbound = persist,
  persistOutbound = persist,
}) {
  if (!message || !String(message).trim()) {
    throw new ApiError(400, 'message is required')
  }

  const settings = await getAiSettings().catch(() => ({
    agent_name: 'Nexora Support Agent',
    system_prompt:
      'You are a professional software-house customer support representative.',
    model: 'gpt-4o-mini',
    temperature: 0.4,
    enabled: true,
  }))

  if (settings.enabled === false) {
    throw new ApiError(503, 'AI agent is currently disabled')
  }

  const context = await resolveConversationContext({
    conversationId,
    contactId,
  })

  if (!isAiAutoReplyEnabled(context.conversation)) {
    throw new ApiError(
      409,
      'AI is disabled for this conversation. A human agent should respond.',
    )
  }

  const trimmed = message.trim()

  if (persistInbound) {
    await db.messages.create(context.conversation.id, {
      sender_type: 'customer',
      message: trimmed,
      message_type: 'text',
      is_ai: false,
    })
  } else {
    // Inbound already stored (e.g. WhatsApp webhook). Avoid duplicating it in prompt history.
    const last = context.history[context.history.length - 1]
    if (last?.sender_type === 'customer' && last.message === trimmed) {
      context.history = context.history.slice(0, -1)
    }
  }

  const languageHint = detectLanguageHint(trimmed)
  const provider = resolveProvider()

  aiLogger.info('Processing customer message', {
    provider,
    conversationId: context.conversation.id,
    languageHint,
    store: env.dataStore,
  })

  let agentResult
  try {
    if (provider === 'openai') {
      agentResult = await runOpenAIAgent({
        message: trimmed,
        settings,
        context,
        languageHint,
      })
    } else {
      agentResult = await runMockAgent({
        message: trimmed,
        settings,
        context,
        languageHint,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    aiLogger.error('Unhandled AI failure', { message: error.message })
    throw new ApiError(500, 'Failed to process AI response')
  }

  const output = sanitizeAgentOutput(agentResult.output)
  const session = agentResult.session || {}
  const knowledgeHits =
    session.toolTrace?.filter((item) => item.name === 'search_knowledge_base')
      .length || 0

  const handoffNeed = detectHandoffNeed({
    message: trimmed,
    output,
    knowledgeHits,
    alreadyRequested: Boolean(session.handoffRequested),
  })

  if (handoffNeed && !session.handoffRequested) {
    const handoff = await requestHumanHandoff({
      conversationId: context.conversation.id,
      reason: handoffNeed.reason,
      reasonCode: handoffNeed.reasonCode,
      triggeredBy: HANDOFF_TRIGGERED_BY.AI,
      metadata: {
        source: 'agent_post_process',
        intent: output.intent,
        lead_score: output.lead_score,
      },
    })
    session.conversation = handoff.conversation
    session.handoffRequested = true
    output.requires_human = true
  } else if (session.handoffRequested) {
    output.requires_human = true
  }

  if (persistOutbound) {
    await db.messages.create(context.conversation.id, {
      sender_type: output.requires_human ? 'system' : 'ai',
      message: output.response,
      message_type: 'text',
      is_ai: true,
    })
  }

  return toPublicAgentResult({
    output,
    provider: agentResult.provider,
    model: agentResult.model,
    toolTrace: agentResult.toolTrace,
    conversationId: context.conversation.id,
    contactId: session.contact?.id || context.conversation.contact_id,
    leadId: session.lead?.id || null,
    appointmentId: session.appointment?.id || null,
    mode: session.conversation?.mode || context.conversation.mode,
    handoffReason: session.conversation?.handoff_reason || null,
  })
}
