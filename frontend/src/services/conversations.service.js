import api, { unwrap } from './api'

export async function listConversations(params = {}) {
  const response = await api.get('/conversations', { params })
  return unwrap(response)
}

export async function getConversation(id) {
  const response = await api.get(`/conversations/${id}`)
  return unwrap(response).data
}

export async function updateConversation(id, payload) {
  const response = await api.put(`/conversations/${id}`, payload)
  return unwrap(response).data
}

export async function takeOverConversation(id, payload = {}) {
  const response = await api.post(`/conversations/${id}/takeover`, payload)
  return unwrap(response).data
}

export async function returnConversationToAi(id, payload = {}) {
  const response = await api.post(`/conversations/${id}/return-to-ai`, payload)
  return unwrap(response).data
}

export async function listHandoffs(id) {
  const response = await api.get(`/conversations/${id}/handoffs`)
  return unwrap(response).data
}

export async function listMessages(conversationId, params = {}) {
  const response = await api.get(`/conversations/${conversationId}/messages`, {
    params,
  })
  return unwrap(response)
}

export async function sendMessage(conversationId, payload) {
  const response = await api.post(
    `/conversations/${conversationId}/messages`,
    payload,
  )
  return unwrap(response).data
}
