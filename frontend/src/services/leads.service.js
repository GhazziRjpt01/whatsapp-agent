import api, { unwrap } from './api'

export async function listLeads(params = {}) {
  const response = await api.get('/leads', { params })
  return unwrap(response)
}

export async function getLead(id) {
  const response = await api.get(`/leads/${id}`)
  return unwrap(response).data
}

export async function createLead(payload) {
  const response = await api.post('/leads', payload)
  return unwrap(response).data
}

export async function updateLead(id, payload) {
  const response = await api.put(`/leads/${id}`, payload)
  return unwrap(response).data
}

export async function deleteLead(id) {
  const response = await api.delete(`/leads/${id}`)
  return unwrap(response)
}
