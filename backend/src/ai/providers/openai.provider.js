import { getOpenAIClient, getConfiguredModel } from '../openai.client.js'
import { buildSystemPrompt, buildUserTurn } from '../prompts.js'
import { toChatMessages } from '../context.builder.js'
import { agentTools } from '../tools.js'
import { createToolExecutor } from '../toolExecutor.js'
import { createEmptyAgentOutput, normalizeAgentOutput } from '../schemas.js'
import { aiLogger } from '../logger.js'
import { ApiError } from '../../utils/ApiError.js'

const MAX_TOOL_ROUNDS = 6

export async function runOpenAIAgent({
  message,
  settings,
  context,
  languageHint,
}) {
  const openai = getOpenAIClient()
  const toolRunner = createToolExecutor({
    contact: context.contact,
    conversation: context.conversation,
    existingLead: context.existingLead,
  })

  const systemPrompt = buildSystemPrompt({
    agentName: settings?.agent_name,
    customPrompt: settings?.system_prompt,
    knowledgeSnippets: (context.knowledgeArticles || []).slice(0, 5),
  })

  const messages = [
    { role: 'system', content: systemPrompt },
    ...toChatMessages(context.history),
    {
      role: 'user',
      content: buildUserTurn({
        message,
        contact: context.contact,
        existingLead: context.existingLead,
        languageHint,
      }),
    },
  ]

  const model = getConfiguredModel(settings?.model || 'gpt-4o-mini')
  const temperature = Number(settings?.temperature ?? 0.4)

  aiLogger.info('OpenAI agent started', {
    model,
    conversationId: context.conversation.id,
  })

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    let completion
    try {
      completion = await openai.chat.completions.create({
        model,
        temperature,
        messages,
        tools: agentTools,
        tool_choice: 'auto',
      })
    } catch (error) {
      aiLogger.error('OpenAI request failed', {
        message: error.message,
        status: error.status,
      })
      throw new ApiError(
        502,
        'AI provider is temporarily unavailable. Please try again.',
      )
    }

    const choice = completion.choices?.[0]?.message
    if (!choice) {
      throw new ApiError(502, 'AI provider returned an empty response')
    }

    messages.push(choice)

    const toolCalls = choice.tool_calls || []
    if (toolCalls.length === 0) {
      const fallback = createEmptyAgentOutput(
        choice.content ||
          'Thanks for reaching out. How can I help you today?',
        { intent: 'other' },
      )
      return {
        output: fallback,
        provider: 'openai',
        model,
        toolTrace: toolRunner.getState().toolTrace,
        session: toolRunner.getState(),
      }
    }

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name
      let args = {}
      try {
        args = toolCall.function?.arguments
          ? JSON.parse(toolCall.function.arguments)
          : {}
      } catch {
        args = {}
      }

      const result = await toolRunner.execute(name, args)
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }

    const finalized = toolRunner.getState().finalized
    if (finalized) {
      return {
        output: normalizeAgentOutput(finalized),
        provider: 'openai',
        model,
        toolTrace: toolRunner.getState().toolTrace,
        session: toolRunner.getState(),
      }
    }
  }

  aiLogger.warn('Agent exceeded tool rounds without finalize_response')
  return {
    output: createEmptyAgentOutput(
      'Thanks for your message. I am connecting you with the right next step shortly.',
      { requires_human: true, intent: 'human_handoff', lead_score: 50 },
    ),
    provider: 'openai',
    model,
    toolTrace: toolRunner.getState().toolTrace,
    session: toolRunner.getState(),
  }
}
