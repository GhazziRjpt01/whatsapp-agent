import api, { unwrap } from './api'

export async function getAiSettings() {
  const response = await api.get('/ai/settings')
  return unwrap(response).data
}

export async function updateAiSettings(payload) {
  const response = await api.put('/ai/settings', payload)
  return unwrap(response).data
}

export async function chatWithAgent(payload) {
  const response = await api.post('/ai/chat', payload)
  return unwrap(response).data
}
