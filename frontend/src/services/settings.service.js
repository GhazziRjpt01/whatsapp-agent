import api, { unwrap } from './api'
import { getAiSettings, updateAiSettings } from './ai.service'

const WORKSPACE_KEY = 'workspace_settings'

export async function getHealth() {
  const response = await api.get('/health')
  return unwrap(response).data
}

export async function getSettingsBundle() {
  const [health, aiSettings] = await Promise.all([
    getHealth(),
    getAiSettings(),
  ])

  const workspace = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}')

  return {
    health,
    aiSettings,
    workspace: {
      company_name: workspace.company_name || 'Nexora Soft',
      support_email: workspace.support_email || 'hello@nexora.io',
      timezone: workspace.timezone || 'Asia/Karachi',
      currency: workspace.currency || 'USD',
      notifications: workspace.notifications || {
        new_conversation: true,
        hot_lead: true,
        appointment_booked: true,
        ai_escalation: true,
      },
    },
  }
}

export async function saveWorkspaceSettings(workspace) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace))
  return workspace
}

export async function saveAiSettings(payload) {
  return updateAiSettings(payload)
}
