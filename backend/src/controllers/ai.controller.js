import * as aiSettingsService from '../services/aiSettings.service.js'
import { processCustomerMessage } from '../ai/agent.service.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function getAiSettings(req, res) {
  const settings = await aiSettingsService.getAiSettings()
  const canViewPrompt = ['ceo', 'admin', 'manager'].includes(req.user?.role)

  return sendSuccess(res, {
    message: 'AI settings fetched successfully',
    data: canViewPrompt
      ? settings
      : {
          ...settings,
          system_prompt: null,
          system_prompt_redacted: true,
        },
  })
}

export async function updateAiSettings(req, res) {
  const settings = await aiSettingsService.updateAiSettings(req.body)
  return sendSuccess(res, {
    message: 'AI settings updated successfully',
    data: settings,
  })
}

export async function chatWithAgent(req, res) {
  const result = await processCustomerMessage({
    message: req.body.message,
    conversationId: req.body.conversation_id,
    contactId: req.body.contact_id,
    persist: req.body.persist !== false,
  })

  return sendSuccess(res, {
    message: 'AI agent response generated successfully',
    data: result,
  })
}
