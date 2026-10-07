import { processCustomerMessage } from './agent.service.js'
import { runOpenAIAgent } from './providers/openai.provider.js'
import { resolveConversationContext } from './context.builder.js'
import { getAiSettings } from '../services/aiSettings.service.js'

/**
 * Backward-compatible helper for simple reply generation.
 * Prefer processCustomerMessage() for full agent workflows.
 */
export async function generateSupportReply(userMessage, context = '') {
  const settings = await getAiSettings()
  const syntheticContext = {
    conversation: { id: 'ad-hoc', contact_id: null, ai_enabled: true },
    contact: null,
    history: [],
    existingLead: null,
    knowledgeArticles: context
      ? [{ title: 'Provided context', content: context, category: 'runtime' }]
      : [],
  }

  const result = await runOpenAIAgent({
    message: userMessage,
    settings,
    context: syntheticContext,
    languageHint: 'english',
  })

  return result.output.response
}

export { processCustomerMessage, resolveConversationContext }
