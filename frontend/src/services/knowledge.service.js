import api, { unwrap } from './api'

export async function listKnowledge(params = {}) {
  const response = await api.get('/knowledge', { params })
  return unwrap(response)
}

export async function createKnowledge(payload) {
  const response = await api.post('/knowledge', payload)
  return unwrap(response).data
}

export async function updateKnowledge(id, payload) {
  const response = await api.put(`/knowledge/${id}`, payload)
  return unwrap(response).data
}

export async function deleteKnowledge(id) {
  const response = await api.delete(`/knowledge/${id}`)
  return unwrap(response)
}
